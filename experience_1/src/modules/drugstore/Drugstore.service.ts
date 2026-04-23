import crypto from "crypto";
import { Op, Transaction } from "sequelize";
import { AUTH_ROLE } from "../../constants/constant";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreMerchantClient } from "./DrugstoreMerchantClient";
import {
	AddCartItemDTO,
	CancelOrderDTO,
	ConfirmOrderPaymentDTO,
	CreateOrderDTO,
	GetCatalogProductsQueryDTO,
	ListOrderQueryDTO,
	UpdateCartItemDTO,
	ValidateCatalogDiscountDTO,
} from "./Drugstore.dto";
import { DrugstoreCart } from "./DrugstoreCart.model";
import { DrugstoreCartItem } from "./DrugstoreCartItem.model";
import { DrugstoreOrder } from "./DrugstoreOrder.model";
import { DrugstoreOrderItem } from "./DrugstoreOrderItem.model";
import { DrugstoreOrderStatusHistory } from "./DrugstoreOrderStatusHistory.model";
import { DrugstoreSyncEvent } from "./DrugstoreSyncEvent.model";
import { DrugstoreAddress } from "./DrugstoreAddress.model";
import { DrugstorePrescription } from "./DrugstorePrescription.model";
import { DrugstorePaystackService } from "./DrugstorePaystack.service";
import { User } from "../users/User.model";
import { applicationConfig } from "../../config";

type MerchantProduct = {
	id: string;
	merchantId: string;
	name: string;
	description?: string | null;
	category?: string | null;
	brand?: string | null;
	sku?: string | null;
	price: number;
	vat: number;
	discountPercentage: number;
	minQuantity: number;
	maxQuantity: number;
	inventory: number;
	images?: { url: string; order?: number; isMain?: boolean }[];
	isActive?: boolean;
	requiresPrescription?: boolean;
};

type MerchantDiscountValidation = {
	valid: boolean;
	discountId: string;
	code: string;
	type: string;
	amount: number;
	discountAmount: number;
	message: string;
};

type MerchantPharmacyProfile = {
	id: string;
	deliveryFeePreview?: number;
	settings?: {
		enableInHouseDelivery?: boolean;
		enablePharmacyPickup?: boolean;
		deliveryFeeType?: "flat" | "distance-based";
		deliveryFlatFee?: number | null;
		deliveryPricePerKm?: number | null;
	};
};

const PAYMENT_PENDING = "pending";
const PAYMENT_PAID = "paid";
const PAYMENT_FAILED = "failed";
const DELIVERY_PENDING = "pending";
const DELIVERY_CANCELLED = "cancelled";
const SYNC_PENDING = "pending";
const SYNC_FAILED = "failed";
const SYNC_SENT = "sent";
const SYNC_SYNCED = "synced";

const toNumber = (value: unknown): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => {
	return Number(value.toFixed(2));
};

const normalizeStringArray = (value?: string[] | string): string[] | undefined => {
	if (!value) return undefined;
	if (Array.isArray(value)) return value;
	return [value];
};

const getDateRange = (range?: string): { start?: Date; end?: Date } => {
	if (!range) return {};
	const now = new Date();
	const start = new Date(now);
	const end = new Date(now);

	if (range === "today") {
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	}

	if (range === "yesterday") {
		start.setDate(start.getDate() - 1);
		end.setDate(end.getDate() - 1);
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	}

	if (range === "last_7_days") {
		start.setDate(start.getDate() - 7);
		return { start, end: now };
	}

	if (range === "last_30_days") {
		start.setDate(start.getDate() - 30);
		return { start, end: now };
	}

	return {};
};

const getAgeBucketWhere = (bucket?: string) => {
	if (!bucket) return {};
	const now = Date.now();
	const h24 = 24 * 60 * 60 * 1000;
	const h48 = 48 * 60 * 60 * 1000;

	if (bucket === "lt_24h") {
		return { placedAt: { [Op.gte]: new Date(now - h24) } };
	}

	if (bucket === "between_24h_48h") {
		return {
			placedAt: {
				[Op.lt]: new Date(now - h24),
				[Op.gte]: new Date(now - h48),
			},
		};
	}

	if (bucket === "gt_48h") {
		return { placedAt: { [Op.lt]: new Date(now - h48) } };
	}

	return {};
};

export class DrugstoreService {
	private static productPath = "/api/v1/merchant/internal/drugstore/products";
	private static categoryPath = "/api/v1/merchant/internal/drugstore/categories";
	private static discountValidatePath = "/api/v1/merchant/internal/drugstore/discounts/validate";
	private static reflectOrderPath = "/api/v1/merchant/internal/drugstore/orders/reflect";
	private static pharmacyPath = "/api/v1/merchant/internal/drugstore/pharmacies";

	private static async getMerchantProduct(merchantId: string, productId: string): Promise<MerchantProduct> {
		return DrugstoreMerchantClient.get<MerchantProduct>(`${this.productPath}/${productId}`, { merchantId });
	}

	private static async getMerchantPharmacyProfile(merchantId: string): Promise<MerchantPharmacyProfile> {
		return DrugstoreMerchantClient.get<MerchantPharmacyProfile>(`${this.pharmacyPath}/${merchantId}`);
	}

	private static getProductImage(product: MerchantProduct): string | null {
		if (!product.images || product.images.length === 0) return null;
		const sorted = [...product.images].sort((a, b) => toNumber(a.order) - toNumber(b.order));
		return sorted[0]?.url || null;
	}

	private static calculateLine(item: { quantity: number; unitPrice: number; vat: number; discountPercentage: number }) {
		const quantity = toNumber(item.quantity);
		const unitPrice = toNumber(item.unitPrice);
		const vat = toNumber(item.vat);
		const discountPercentage = toNumber(item.discountPercentage);

		const lineSubtotal = roundMoney(unitPrice * quantity);
		const lineVatTotal = roundMoney(vat * quantity);
		const lineDiscountTotal = roundMoney((unitPrice * (discountPercentage / 100)) * quantity);
		const lineTotal = roundMoney(lineSubtotal + lineVatTotal - lineDiscountTotal);

		return { lineSubtotal, lineVatTotal, lineDiscountTotal, lineTotal };
	}

	private static async recalculateCartTotals(cart: DrugstoreCart, transaction?: Transaction) {
		const items = await DrugstoreCartItem.findAll({ where: { cartId: cart.id }, transaction });
		const subtotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.lineSubtotal), 0));
		const vatTotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.lineVatTotal), 0));
		const discountTotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.lineDiscountTotal), 0));
		const grandTotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0));

		await cart.update(
			{ subtotal, vatTotal, discountTotal, grandTotal },
			{ transaction }
		);

		const refreshedCart = await DrugstoreCart.findByPk(cart.id, {
			include: [{ model: DrugstoreCartItem, as: "items" }],
			transaction,
		});

		return refreshedCart || cart;
	}

	private static async findOrCreateActiveCart(userId: number, merchantId: string): Promise<DrugstoreCart> {
		const existing = await DrugstoreCart.findOne({
			where: { userId, merchantId, status: "active" },
			order: [["createdAt", "DESC"]],
		});

		if (existing) return existing;

		return DrugstoreCart.create({
			userId,
			merchantId,
			status: "active",
			currency: "NGN",
			subtotal: 0,
			vatTotal: 0,
			discountTotal: 0,
			grandTotal: 0,
		});
	}

	private static async findConflictingActiveCart(userId: number, merchantId: string): Promise<DrugstoreCart | null> {
		return DrugstoreCart.findOne({
			where: {
				userId,
				merchantId: { [Op.ne]: merchantId },
				status: { [Op.in]: ["active", "pending_checkout"] },
			},
			order: [["createdAt", "DESC"]],
		});
	}

	private static async resolveDeliveryAddress(userId: number, addressId?: string): Promise<DrugstoreAddress | null> {
		if (addressId) {
			return DrugstoreAddress.findOne({ where: { id: addressId, userId } });
		}

		return DrugstoreAddress.findOne({
			where: { userId, isDefault: true },
			order: [["createdAt", "DESC"]],
		});
	}

	private static async calculateDeliveryFee(merchantId: string): Promise<number> {
		const pharmacy = await this.getMerchantPharmacyProfile(merchantId);
		const flatFee = toNumber(pharmacy?.settings?.deliveryFlatFee ?? pharmacy?.deliveryFeePreview ?? 0);
		return roundMoney(flatFee);
	}

	private static async createStatusHistory(params: {
		orderId: string;
		statusType: "payment" | "delivery" | "sync";
		fromStatus?: string | null;
		toStatus: string;
		actorType: "system" | "user" | "merchant" | "webhook";
		actorId?: string | null;
		note?: string | null;
		metadata?: Record<string, unknown> | null;
		transaction?: Transaction;
	}) {
		await DrugstoreOrderStatusHistory.create(
			{
				orderId: params.orderId,
				statusType: params.statusType,
				fromStatus: params.fromStatus || null,
				toStatus: params.toStatus,
				actorType: params.actorType,
				actorId: params.actorId || null,
				note: params.note || null,
				metadata: params.metadata || null,
			},
			{ transaction: params.transaction }
		);
	}

	private static buildSyncPayload(order: DrugstoreOrder, items: DrugstoreOrderItem[]) {
		return {
			sourceOrderId: order.sourceOrderId,
			sourceSyncKey: order.merchantSyncKey,
			paymentReference: order.paymentReference,
			paymentVerifiedAt: order.paymentVerifiedAt,
			paymentStatus: order.paymentStatus,
			deliveryStatus: order.deliveryStatus,
			merchantId: order.merchantId,
			user: {
				id: order.userId,
				role: order.userRoleSnapshot,
			},
			amounts: {
				subtotal: order.subtotal,
				vatTotal: order.vatTotal,
				discountTotal: order.discountTotal,
				deliveryFee: order.deliveryFee,
				totalAmount: order.totalAmount,
				currency: order.currency,
			},
			delivery: {
				recipientName: order.recipientName,
				recipientPhone: order.recipientPhone,
				addressLine1: order.addressLine1,
				addressLine2: order.addressLine2,
				city: order.city,
				state: order.state,
				landmark: order.landmark,
				deliveryNote: order.deliveryNote,
				deliveryDate: order.deliveryDate,
				deliveryTimeSlot: order.deliveryTimeSlot,
			},
			discount: {
				code: order.discountCode,
				discountId: order.discountIdSnapshot,
			},
			items: items.map((item) => ({
				merchantId: item.merchantId,
				merchantProductId: item.merchantProductId,
				quantity: item.quantity,
				productNameSnapshot: item.productNameSnapshot,
				skuSnapshot: item.skuSnapshot,
				categorySnapshot: item.categorySnapshot,
				brandSnapshot: item.brandSnapshot,
				imageUrlSnapshot: item.imageUrlSnapshot,
				unitPriceSnapshot: item.unitPriceSnapshot,
				vatSnapshot: item.vatSnapshot,
				discountPercentageSnapshot: item.discountPercentageSnapshot,
				requiresPrescriptionSnapshot: item.requiresPrescriptionSnapshot,
				lineSubtotal: item.lineSubtotal,
				lineVatTotal: item.lineVatTotal,
				lineDiscountTotal: item.lineDiscountTotal,
				lineTotal: item.lineTotal,
			})),
			placedAt: order.placedAt,
		};
	}

	private static async enqueueSyncEvent(order: DrugstoreOrder, transaction?: Transaction) {
		const items = await DrugstoreOrderItem.findAll({ where: { orderId: order.id }, transaction });
		const payload = this.buildSyncPayload(order, items);
		const payloadHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

		const existing = await DrugstoreSyncEvent.findOne({ where: { sourceSyncKey: order.merchantSyncKey }, transaction });
		if (existing) {
			return existing;
		}

		return DrugstoreSyncEvent.create(
			{
				orderId: order.id,
				sourceOrderId: order.sourceOrderId,
				paymentReference: order.paymentReference || "",
				sourceSyncKey: order.merchantSyncKey || "",
				payloadHash,
				status: SYNC_PENDING,
				attempts: 0,
				nextRetryAt: null,
				lastError: null,
				requestPayload: payload,
				responsePayload: null,
			},
			{ transaction }
		);
	}

	static async getCatalogProducts(query: GetCatalogProductsQueryDTO): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get<{ products: MerchantProduct[]; pagination: any }>(this.productPath, query as any);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async getCatalogProduct(productId: string, merchantId: string): Promise<ApiResponse> {
		const data = await this.getMerchantProduct(merchantId, productId);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async getCatalogCategories(merchantId: string): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get(this.categoryPath, { merchantId });
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async validateCatalogDiscount(payload: ValidateCatalogDiscountDTO): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.post<MerchantDiscountValidation>(this.discountValidatePath, payload);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async getCart(userId: number, merchantId?: string): Promise<ApiResponse> {
		const where: Record<string, unknown> = { userId, status: "active" };
		if (merchantId) where.merchantId = merchantId;

		const cart = await DrugstoreCart.findOne({
			where,
			include: [{ model: DrugstoreCartItem, as: "items" }],
			order: [["createdAt", "DESC"]],
		});

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: cart,
		};
	}

	static async addCartItem(userId: number, payload: AddCartItemDTO): Promise<ApiResponse> {
		const conflictingCart = await this.findConflictingActiveCart(userId, payload.merchantId);
		if (conflictingCart) {
			return {
				status: false,
				code: 409,
				message: "You can only shop from one pharmacy at a time. Clear your current cart before switching pharmacies.",
			};
		}

		const product = await this.getMerchantProduct(payload.merchantId, payload.merchantProductId);

		if (product.isActive === false || product.inventory <= 0) {
			return { status: false, code: 400, message: "Product is unavailable" };
		}

		if (payload.quantity < product.minQuantity || payload.quantity > product.maxQuantity) {
			return {
				status: false,
				code: 400,
				message: `Quantity must be between ${product.minQuantity} and ${product.maxQuantity}`,
			};
		}

		if (payload.quantity > product.inventory) {
			return {
				status: false,
				code: 400,
				message: "Requested quantity exceeds available stock",
			};
		}

		const cart = await this.findOrCreateActiveCart(userId, payload.merchantId);

		let item = await DrugstoreCartItem.findOne({
			where: { cartId: cart.id, merchantProductId: payload.merchantProductId },
		});

		const line = this.calculateLine({
			quantity: payload.quantity,
			unitPrice: toNumber(product.price),
			vat: toNumber(product.vat),
			discountPercentage: toNumber(product.discountPercentage),
		});

		if (!item) {
			item = await DrugstoreCartItem.create({
				cartId: cart.id,
				merchantId: payload.merchantId,
				merchantProductId: payload.merchantProductId,
				skuSnapshot: product.sku || null,
				productNameSnapshot: product.name,
				brandSnapshot: product.brand || null,
				categorySnapshot: product.category || null,
				imageUrlSnapshot: this.getProductImage(product),
				unitPriceSnapshot: toNumber(product.price),
				vatSnapshot: toNumber(product.vat),
				discountPercentageSnapshot: toNumber(product.discountPercentage),
				minQuantitySnapshot: toNumber(product.minQuantity),
				maxQuantitySnapshot: toNumber(product.maxQuantity),
				requiresPrescriptionSnapshot: Boolean(product.requiresPrescription),
				quantity: payload.quantity,
				...line,
			});
		} else {
			await item.update({
				skuSnapshot: product.sku || null,
				productNameSnapshot: product.name,
				brandSnapshot: product.brand || null,
				categorySnapshot: product.category || null,
				imageUrlSnapshot: this.getProductImage(product),
				unitPriceSnapshot: toNumber(product.price),
				vatSnapshot: toNumber(product.vat),
				discountPercentageSnapshot: toNumber(product.discountPercentage),
				minQuantitySnapshot: toNumber(product.minQuantity),
				maxQuantitySnapshot: toNumber(product.maxQuantity),
				requiresPrescriptionSnapshot: Boolean(product.requiresPrescription),
				quantity: payload.quantity,
				...line,
			});
		}

		const updatedCart = await this.recalculateCartTotals(cart);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: updatedCart,
		};
	}

	static async updateCartItem(userId: number, itemId: string, payload: UpdateCartItemDTO): Promise<ApiResponse> {
		const item = await DrugstoreCartItem.findByPk(itemId, { include: [{ model: DrugstoreCart, as: "cart" }] });
		if (!item || !item.cart || item.cart.userId !== userId || item.cart.status !== "active") {
			return { status: false, code: 404, message: "Cart item not found" };
		}

		const product = await this.getMerchantProduct(item.merchantId, item.merchantProductId);
		if (payload.quantity > product.inventory) {
			return { status: false, code: 400, message: "Requested quantity exceeds available stock" };
		}

		if (payload.quantity < product.minQuantity || payload.quantity > product.maxQuantity) {
			return {
				status: false,
				code: 400,
				message: `Quantity must be between ${product.minQuantity} and ${product.maxQuantity}`,
			};
		}

		const line = this.calculateLine({
			quantity: payload.quantity,
			unitPrice: toNumber(product.price),
			vat: toNumber(product.vat),
			discountPercentage: toNumber(product.discountPercentage),
		});

		await item.update({
			skuSnapshot: product.sku || null,
			productNameSnapshot: product.name,
			brandSnapshot: product.brand || null,
			categorySnapshot: product.category || null,
			imageUrlSnapshot: this.getProductImage(product),
			unitPriceSnapshot: toNumber(product.price),
			vatSnapshot: toNumber(product.vat),
			discountPercentageSnapshot: toNumber(product.discountPercentage),
			minQuantitySnapshot: toNumber(product.minQuantity),
			maxQuantitySnapshot: toNumber(product.maxQuantity),
			requiresPrescriptionSnapshot: Boolean(product.requiresPrescription),
			quantity: payload.quantity,
			...line,
		});

		const updatedCart = await this.recalculateCartTotals(item.cart);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: updatedCart,
		};
	}

	static async removeCartItem(userId: number, itemId: string): Promise<ApiResponse> {
		const item = await DrugstoreCartItem.findByPk(itemId, { include: [{ model: DrugstoreCart, as: "cart" }] });
		if (!item || !item.cart || item.cart.userId !== userId || item.cart.status !== "active") {
			return { status: false, code: 404, message: "Cart item not found" };
		}

		await item.destroy();
		const updatedCart = await this.recalculateCartTotals(item.cart);

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: updatedCart,
		};
	}

	static async createOrder(userId: number, userRole: string | undefined, payload: CreateOrderDTO): Promise<ApiResponse> {
		const cart = await DrugstoreCart.findOne({
			where: { userId, status: "active" },
			include: [{ model: DrugstoreCartItem, as: "items" }],
			order: [["createdAt", "DESC"]],
		});

		if (!cart) return { status: false, code: 404, message: "No active cart found" };
		const items = (cart.items || []) as DrugstoreCartItem[];
		if (items.length === 0) return { status: false, code: 400, message: "Cart is empty" };

		const address = await this.resolveDeliveryAddress(userId, payload.addressId);
		if (!address) {
			return { status: false, code: 400, message: "A delivery address is required" };
		}

		const conflictingCart = await this.findConflictingActiveCart(userId, cart.merchantId);
		if (conflictingCart) {
			return {
				status: false,
				code: 409,
				message: "You can only shop from one pharmacy at a time. Clear your current cart before switching pharmacies.",
			};
		}

		const latestSnapshots: Array<Partial<DrugstoreOrderItem>> = [];
		let requiresPrescription = false;
		for (const item of items) {
			const product = await this.getMerchantProduct(cart.merchantId, item.merchantProductId);
			if (product.isActive === false || product.inventory <= 0) {
				return { status: false, code: 400, message: `Product ${product.name} is unavailable` };
			}
			if (item.quantity > product.inventory) {
				return { status: false, code: 400, message: `Insufficient stock for ${product.name}` };
			}
			if (item.quantity < product.minQuantity || item.quantity > product.maxQuantity) {
				return {
					status: false,
					code: 400,
					message: `Quantity for ${product.name} must be between ${product.minQuantity} and ${product.maxQuantity}`,
				};
			}

			const line = this.calculateLine({
				quantity: item.quantity,
				unitPrice: toNumber(product.price),
				vat: toNumber(product.vat),
				discountPercentage: toNumber(product.discountPercentage),
			});

			latestSnapshots.push({
				merchantId: cart.merchantId,
				merchantProductId: product.id,
				skuSnapshot: product.sku || null,
				productNameSnapshot: product.name,
				descriptionSnapshot: product.description || null,
				brandSnapshot: product.brand || null,
				categorySnapshot: product.category || null,
				imageUrlSnapshot: this.getProductImage(product),
				unitPriceSnapshot: toNumber(product.price),
				vatSnapshot: toNumber(product.vat),
				discountPercentageSnapshot: toNumber(product.discountPercentage),
				requiresPrescriptionSnapshot: Boolean(product.requiresPrescription || item.requiresPrescriptionSnapshot),
				quantity: item.quantity,
				lineSubtotal: line.lineSubtotal,
				lineVatTotal: line.lineVatTotal,
				lineDiscountTotal: line.lineDiscountTotal,
				lineTotal: line.lineTotal,
			});
			requiresPrescription = requiresPrescription || Boolean(product.requiresPrescription || item.requiresPrescriptionSnapshot);
		}

		let prescription: DrugstorePrescription | null = null;
		if (requiresPrescription) {
			prescription = await DrugstorePrescription.findOne({
				where: { userId, merchantId: cart.merchantId, cartId: cart.id, status: "approved" },
				order: [["reviewedAt", "DESC"]],
			});
			if (!prescription) {
				return {
					status: false,
					code: 400,
					message: "Prescription approval is required before checkout can continue",
				};
			}
		}

		const subtotal = roundMoney(latestSnapshots.reduce((sum, item) => sum + toNumber(item.lineSubtotal), 0));
		const vatTotal = roundMoney(latestSnapshots.reduce((sum, item) => sum + toNumber(item.lineVatTotal), 0));
		let discountTotal = 0;
		let discountCode = payload.couponCode || null;
		let discountIdSnapshot: string | null = null;

		if (discountCode) {
			const discountValidation = await DrugstoreMerchantClient.post<MerchantDiscountValidation>(this.discountValidatePath, {
				merchantId: cart.merchantId,
				code: discountCode,
				orderAmount: subtotal + vatTotal,
				productIds: latestSnapshots.map((item) => item.merchantProductId),
			});
			discountTotal = roundMoney(toNumber(discountValidation.discountAmount));
			discountCode = discountValidation.code;
			discountIdSnapshot = discountValidation.discountId;
		}

		const deliveryFee = await this.calculateDeliveryFee(cart.merchantId);
		const totalAmount = roundMoney(subtotal + vatTotal - discountTotal + deliveryFee);
		const user = await User.findByPk(userId);
		if (!user?.email) {
			return { status: false, code: 400, message: "User email is required to initialize payment" };
		}

		const reference = `drg_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
		const channels = payload.paymentMethod === "bank_transfer" ? ["bank_transfer"] : ["card"];

		const sequelize = DrugstoreOrder.sequelize;
		if (!sequelize) {
			throw new Error("Database not initialized");
		}

		const transaction = await sequelize.transaction();
		try {
			const order = await DrugstoreOrder.create(
				{
					sourceOrderId: crypto.randomUUID(),
					userId,
					userRoleSnapshot: userRole === AUTH_ROLE.DOCTOR ? AUTH_ROLE.DOCTOR : AUTH_ROLE.CONSUMER,
					cartId: cart.id,
					merchantId: cart.merchantId,
					merchantOrderId: null,
					paymentMethod: payload.paymentMethod,
					paymentReference: reference,
					paymentStatus: PAYMENT_PENDING,
					paymentVerifiedAt: null,
					deliveryStatus: DELIVERY_PENDING,
					merchantSyncStatus: SYNC_PENDING,
					merchantSyncKey: null,
					merchantSyncAttempts: 0,
					merchantSyncedAt: null,
					merchantSyncLastError: null,
					discountCode,
					discountIdSnapshot,
					addressId: address.id,
					prescriptionId: prescription?.id || null,
					subtotal,
					vatTotal,
					discountTotal,
					deliveryFee,
					totalAmount,
					currency: "NGN",
					recipientName: address.recipientName,
					recipientPhone: address.recipientPhone,
					addressLine1: address.addressLine1,
					addressLine2: address.addressLine2 || null,
					city: address.city,
					state: address.state,
					landmark: null,
					deliveryNote: payload.deliveryNote || null,
					deliveryDate: payload.deliveryDate || null,
					deliveryTimeSlot: payload.deliveryTimeSlot || null,
					placedAt: new Date(),
					cancelledAt: null,
				},
				{ transaction }
			);

			for (const item of latestSnapshots) {
				await DrugstoreOrderItem.create(
					{
						orderId: order.id,
						merchantId: item.merchantId,
						merchantProductId: item.merchantProductId,
						skuSnapshot: item.skuSnapshot || null,
						productNameSnapshot: item.productNameSnapshot,
						descriptionSnapshot: item.descriptionSnapshot || null,
						brandSnapshot: item.brandSnapshot || null,
						categorySnapshot: item.categorySnapshot || null,
						imageUrlSnapshot: item.imageUrlSnapshot || null,
						unitPriceSnapshot: toNumber(item.unitPriceSnapshot),
						vatSnapshot: toNumber(item.vatSnapshot),
						discountPercentageSnapshot: toNumber(item.discountPercentageSnapshot),
						requiresPrescriptionSnapshot: Boolean(item.requiresPrescriptionSnapshot),
						quantity: toNumber(item.quantity),
						lineSubtotal: toNumber(item.lineSubtotal),
						lineVatTotal: toNumber(item.lineVatTotal),
						lineDiscountTotal: toNumber(item.lineDiscountTotal),
						lineTotal: toNumber(item.lineTotal),
					},
					{ transaction }
				);
			}

			await this.createStatusHistory({
				orderId: order.id,
				statusType: "payment",
				fromStatus: null,
				toStatus: PAYMENT_PENDING,
				actorType: "system",
				metadata: { paymentReference: reference },
				transaction,
			});
			await this.createStatusHistory({
				orderId: order.id,
				statusType: "delivery",
				fromStatus: null,
				toStatus: DELIVERY_PENDING,
				actorType: "system",
				transaction,
			});
			await this.createStatusHistory({
				orderId: order.id,
				statusType: "sync",
				fromStatus: null,
				toStatus: SYNC_PENDING,
				actorType: "system",
				transaction,
			});

			await cart.update({ status: "pending_checkout" }, { transaction });
			await transaction.commit();

			const payment = await DrugstorePaystackService.initializeTransaction(
				user.email,
				Math.round(totalAmount * 100),
				reference,
				{
					type: "drugstore_order",
					orderId: order.id,
					sourceOrderId: order.sourceOrderId,
					merchantId: cart.merchantId,
					userId,
				},
				channels
			);

			const result = await DrugstoreOrder.findByPk(order.id, {
				include: [{ model: DrugstoreOrderItem, as: "items" }],
			});

			return {
				status: true,
				code: 201,
				message: "Order created and payment initialized successfully",
				data: {
					order: result,
					payment: {
						reference: payment.reference,
						authorizationUrl: payment.authorizationUrl,
						redirectUrl: payment.authorizationUrl,
						accessCode: payment.accessCode,
						amount: totalAmount,
						currency: "NGN",
					},
				},
			};
		} catch (error) {
			try {
				await cart.update({ status: "active" });
			} catch (_error) {}
			if (!(transaction as any).finished) {
				await transaction.rollback();
			}
			throw error;
		}
	}

	static async confirmOrderPayment(userId: number, orderId: string, payload: ConfirmOrderPaymentDTO): Promise<ApiResponse> {
		const order = await DrugstoreOrder.findOne({ where: { id: orderId, userId } });
		if (!order) return { status: false, code: 404, message: "Order not found" };

		if (order.paymentStatus === PAYMENT_PAID && order.paymentReference === payload.paymentReference) {
			return {
				status: true,
				code: 200,
				message: "Payment already confirmed",
				data: order,
			};
		}

		if (order.paymentStatus === PAYMENT_PAID && order.paymentReference !== payload.paymentReference) {
			return { status: false, code: 409, message: "Order already paid with a different payment reference" };
		}

		if (order.paymentReference && order.paymentReference !== payload.paymentReference) {
			return { status: false, code: 409, message: "Payment reference does not match the initialized transaction" };
		}

		const verification = await DrugstorePaystackService.verifyTransaction(payload.paymentReference);
		if (verification.status !== "success") {
			const previousFailed = order.paymentStatus;
			await order.update({ paymentStatus: PAYMENT_FAILED });
			if (order.cartId) {
				try {
					await DrugstoreCart.update({ status: "active" }, { where: { id: order.cartId, userId } });
				} catch (_error) {}
			}
			await this.createStatusHistory({
				orderId: order.id,
				statusType: "payment",
				fromStatus: previousFailed,
				toStatus: PAYMENT_FAILED,
				actorType: "webhook",
				actorId: String(userId),
				note: "Payment verification failed",
			});

			return { status: false, code: 400, message: "Payment was not successful" };
		}

		const expectedAmountKobo = Math.round(toNumber(order.totalAmount) * 100);
		if (toNumber(verification.amount) !== expectedAmountKobo) {
			return { status: false, code: 400, message: "Verified payment amount does not match the order total" };
		}

		const syncKey = `${order.sourceOrderId}:${verification.reference}`;
		const previousPayment = order.paymentStatus;
		await order.update({
			paymentStatus: PAYMENT_PAID,
			paymentReference: verification.reference,
			paymentVerifiedAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
			merchantSyncKey: syncKey,
			merchantSyncStatus: SYNC_PENDING,
			merchantSyncLastError: null,
		});
		if (order.cartId) {
			try {
				await DrugstoreCart.update({ status: "checked_out" }, { where: { id: order.cartId, userId } });
			} catch (_error) {}
		}

		await this.createStatusHistory({
			orderId: order.id,
			statusType: "payment",
			fromStatus: previousPayment,
			toStatus: PAYMENT_PAID,
			actorType: "webhook",
			actorId: String(userId),
			metadata: { channel: verification.channel, amount: verification.amount },
		});

		await this.enqueueSyncEvent(order);
		void this.processPendingSyncEvents();

		const result = await DrugstoreOrder.findByPk(order.id, { include: [{ model: DrugstoreOrderItem, as: "items" }] });

		return {
			status: true,
			code: 200,
			message: "Payment confirmed and order queued for merchant sync",
			data: result,
		};
	}

	static async listOrders(userId: number, query: ListOrderQueryDTO): Promise<ApiResponse> {
		const page = toNumber(query.page || 1);
		const limit = toNumber(query.limit || 20);
		const offset = (page - 1) * limit;

		const paymentStatus = normalizeStringArray(query.paymentStatus as any);
		const deliveryStatus = normalizeStringArray(query.deliveryStatus as any);
		const dateRange = getDateRange(query.dateRange);

		const where: Record<string, any> = { userId };
		if (paymentStatus && paymentStatus.length > 0) where.paymentStatus = { [Op.in]: paymentStatus };
		if (deliveryStatus && deliveryStatus.length > 0) where.deliveryStatus = { [Op.in]: deliveryStatus };
		if (dateRange.start && dateRange.end) where.placedAt = { [Op.between]: [dateRange.start, dateRange.end] };

		Object.assign(where, getAgeBucketWhere(query.ageBucket));

		const { rows, count } = await DrugstoreOrder.findAndCountAll({
			where,
			include: [{ model: DrugstoreOrderItem, as: "items" }],
			order: [["createdAt", "DESC"]],
			limit,
			offset,
		});

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: {
				items: rows,
				pagination: {
					total: count,
					page,
					limit,
					totalPages: Math.ceil(count / limit),
				},
			},
		};
	}

	static async getOrderById(userId: number, orderId: string): Promise<ApiResponse> {
		const order = await DrugstoreOrder.findOne({
			where: { id: orderId, userId },
			include: [
				{ model: DrugstoreOrderItem, as: "items" },
				{ model: DrugstoreOrderStatusHistory, as: "statusHistory" },
			],
		});

		if (!order) return { status: false, code: 404, message: "Order not found" };

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: order,
		};
	}

	static async cancelOrder(userId: number, orderId: string, payload: CancelOrderDTO): Promise<ApiResponse> {
		const order = await DrugstoreOrder.findOne({ where: { id: orderId, userId } });
		if (!order) return { status: false, code: 404, message: "Order not found" };

		if (order.deliveryStatus === DELIVERY_CANCELLED) {
			return {
				status: true,
				code: 200,
				message: "Order already cancelled",
				data: order,
			};
		}

		if (order.paymentStatus !== PAYMENT_PENDING || order.merchantSyncStatus !== SYNC_PENDING) {
			return {
				status: false,
				code: 400,
				message: "Only unpaid and unsynced orders can be cancelled",
			};
		}

		const previous = order.deliveryStatus;
		await order.update({ deliveryStatus: DELIVERY_CANCELLED, cancelledAt: new Date() });
		await this.createStatusHistory({
			orderId: order.id,
			statusType: "delivery",
			fromStatus: previous,
			toStatus: DELIVERY_CANCELLED,
			actorType: "user",
			actorId: String(userId),
			note: payload.reason || null,
		});

		return {
			status: true,
			code: 200,
			message: "Order cancelled successfully",
			data: order,
		};
	}

	static async syncMerchantOrderStatus(payload: {
		sourceOrderId?: string;
		merchantOrderId?: string;
		deliveryStatus?: "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";
		note?: string;
	}) {
		const sourceOrderId = String(payload.sourceOrderId || "").trim();
		const merchantOrderId = String(payload.merchantOrderId || "").trim();
		const deliveryStatus = payload.deliveryStatus;

		if (!sourceOrderId && !merchantOrderId) {
			return { status: false, code: 400, message: "sourceOrderId or merchantOrderId is required" };
		}

		if (!deliveryStatus) {
			return { status: false, code: 400, message: "deliveryStatus is required" };
		}

		const order = await DrugstoreOrder.findOne({
			where: sourceOrderId ? { sourceOrderId } : { merchantOrderId },
		});
		if (!order) {
			return { status: false, code: 404, message: "Order not found" };
		}

		if (order.deliveryStatus === deliveryStatus) {
			return {
				status: true,
				code: 200,
				message: "Order status already synchronized",
				data: order,
			};
		}

		const previous = order.deliveryStatus;
		await order.update({ deliveryStatus });
		await this.createStatusHistory({
			orderId: order.id,
			statusType: "delivery",
			fromStatus: previous,
			toStatus: deliveryStatus,
			actorType: "merchant",
			actorId: merchantOrderId || null,
			note: payload.note || null,
		});

		return {
			status: true,
			code: 200,
			message: "Order delivery status synchronized successfully",
			data: order,
		};
	}

	static async processPendingSyncEvents(maxBatch?: number): Promise<void> {
		const enabled = applicationConfig.merchantIntegration?.syncWorker?.enabled !== false;
		if (!enabled) return;

		const batchSize = maxBatch || applicationConfig.merchantIntegration?.syncWorker?.batchSize || 10;
		const maxAttempts = applicationConfig.merchantIntegration?.syncWorker?.maxAttempts || 8;
		const baseRetryDelayMs = applicationConfig.merchantIntegration?.syncWorker?.baseRetryDelayMs || 30000;
		const maxRetryDelayMs = applicationConfig.merchantIntegration?.syncWorker?.maxRetryDelayMs || 30 * 60 * 1000;

		const now = new Date();
		const events = await DrugstoreSyncEvent.findAll({
			where: {
				status: { [Op.in]: [SYNC_PENDING, SYNC_FAILED] },
				[Op.or]: [{ nextRetryAt: null }, { nextRetryAt: { [Op.lte]: now } }],
			},
			order: [["createdAt", "ASC"]],
			limit: batchSize,
		});

		for (const event of events) {
			if (event.attempts >= maxAttempts) continue;

			const updateCount = await DrugstoreSyncEvent.update(
				{ status: "processing" },
				{ where: { id: event.id, status: { [Op.in]: [SYNC_PENDING, SYNC_FAILED] } } }
			);
			if (!updateCount[0]) continue;

			const order = await DrugstoreOrder.findByPk(event.orderId);
			if (!order || order.paymentStatus !== PAYMENT_PAID) {
				await event.update({ status: SYNC_FAILED, lastError: "Order not eligible for sync" });
				continue;
			}

			try {
				const response = await DrugstoreMerchantClient.post<{ merchantOrderId: string }>(this.reflectOrderPath, event.requestPayload);

				await event.update({
					status: SYNC_SENT,
					attempts: event.attempts + 1,
					nextRetryAt: null,
					lastError: null,
					responsePayload: response as any,
				});

				const previousSync = order.merchantSyncStatus;
				await order.update({
					merchantSyncStatus: SYNC_SYNCED,
					merchantOrderId: (response as any)?.merchantOrderId || order.merchantOrderId,
					merchantSyncedAt: new Date(),
					merchantSyncAttempts: order.merchantSyncAttempts + 1,
					merchantSyncLastError: null,
				});

				await this.createStatusHistory({
					orderId: order.id,
					statusType: "sync",
					fromStatus: previousSync,
					toStatus: SYNC_SYNCED,
					actorType: "system",
				});
			} catch (error: any) {
				const attempts = event.attempts + 1;
				const delay = Math.min(maxRetryDelayMs, baseRetryDelayMs * Math.pow(2, Math.max(0, attempts - 1)));
				const nextRetryAt = attempts >= maxAttempts ? null : new Date(Date.now() + delay);
				const message = error?.response?.data?.message || error?.message || "Sync failed";

				await event.update({
					status: SYNC_FAILED,
					attempts,
					nextRetryAt,
					lastError: message,
				});

				const previousSync = order.merchantSyncStatus;
				await order.update({
					merchantSyncStatus: SYNC_FAILED,
					merchantSyncAttempts: order.merchantSyncAttempts + 1,
					merchantSyncLastError: message,
				});

				await this.createStatusHistory({
					orderId: order.id,
					statusType: "sync",
					fromStatus: previousSync,
					toStatus: SYNC_FAILED,
					actorType: "system",
					note: message,
				});
			}
		}
	}
}
