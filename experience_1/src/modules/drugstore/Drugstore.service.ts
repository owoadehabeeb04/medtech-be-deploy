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
import { DrugstoreWalletService } from "./DrugstoreWallet.service";
import { DrugstoreSavedCardService } from "./DrugstoreSavedCard.service";
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

// Thrown by createOrder's validation steps once the cart has already been claimed (flipped out of
// "active"), so the single outer catch can both revert the cart and translate this back into the
// ApiResponse shape — every failure path after the claim needs the revert, and a thrown error is
// the only way to guarantee that without duplicating the revert at each early-return site.
class CheckoutError extends Error {
	constructor(public readonly code: number, message: string) {
		super(message);
	}
}

const toNumber = (value: unknown): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => {
	return Number(value.toFixed(2));
};

// Crockford-style alphabet, minus 0/O/1/I/L, to keep the customer-facing order code unambiguous when read aloud.
const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const ORDER_CODE_LENGTH = 6;

const generateOrderCodeCandidate = (): string => {
	const bytes = crypto.randomBytes(ORDER_CODE_LENGTH);
	let code = "";
	for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
		code += ORDER_CODE_ALPHABET[bytes[i] % ORDER_CODE_ALPHABET.length];
	}
	return code;
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

	private static async generateUniqueOrderCode(): Promise<string> {
		for (let attempt = 0; attempt < 5; attempt++) {
			const candidate = generateOrderCodeCandidate();
			const existing = await DrugstoreOrder.findOne({ where: { orderCode: candidate } });
			if (!existing) return candidate;
		}
		throw new Error("Failed to generate a unique order code");
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

		try {
			return await DrugstoreCart.create({
				userId,
				merchantId,
				status: "active",
				currency: "NGN",
				subtotal: 0,
				vatTotal: 0,
				discountTotal: 0,
				grandTotal: 0,
			});
		} catch (error: any) {
			// Two concurrent add-to-cart calls (e.g. a frontend double-submit) can both pass the
			// findOne check above before either commits. The partial unique index on
			// (user_id, merchant_id) WHERE status='active' lets only one create() win; the loser
			// just re-fetches and uses that cart instead of ending up with two split active carts.
			if (error?.name === "SequelizeUniqueConstraintError") {
				const winner = await DrugstoreCart.findOne({ where: { userId, merchantId, status: "active" } });
				if (winner) return winner;
			}
			throw error;
		}
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
			fulfillmentMethod: order.fulfillmentMethod,
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

		try {
			return await DrugstoreSyncEvent.create(
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
		} catch (error: any) {
			// sourceSyncKey is unique — a concurrent duplicate call (webhook redelivery, a frontend
			// retry racing this same confirm-payment request) can lose this exact race. Treat that as
			// "already enqueued" rather than letting the loser crash with an unhandled 500.
			if (error?.name === "SequelizeUniqueConstraintError") {
				const raceWinner = await DrugstoreSyncEvent.findOne({ where: { sourceSyncKey: order.merchantSyncKey }, transaction });
				if (raceWinner) return raceWinner;
			}
			throw error;
		}
	}

	static async getCatalogProducts(query: GetCatalogProductsQueryDTO): Promise<ApiResponse> {
		const { brand, ...rest } = query;
		const outboundQuery: Record<string, any> = { ...rest };
		if (brand) {
			outboundQuery.brand = Array.isArray(brand) ? brand.join(",") : brand;
		}

		const data = await DrugstoreMerchantClient.get<{ products: MerchantProduct[]; pagination: any }>(this.productPath, outboundQuery);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async getCatalogBrands(category?: string, merchantId?: string): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get<{ brands: string[] }>("/api/v1/merchant/internal/drugstore/product-brands", {
			category,
			merchantId,
		});
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data,
		};
	}

	static async getTopSellingProducts(limit: number): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get<{ products: MerchantProduct[] }>(
			"/api/v1/merchant/internal/drugstore/top-selling-products",
			{ limit }
		);
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

	static async getProductOrderLimits(merchantId: string, productId: string): Promise<ApiResponse> {
		const product = await this.getMerchantProduct(merchantId, productId);
		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: {
				productId: product.id,
				merchantId: product.merchantId,
				minQuantity: product.minQuantity,
				maxQuantity: product.maxQuantity,
				inventory: product.inventory,
				isActive: product.isActive,
				requiresPrescription: Boolean(product.requiresPrescription),
			},
		};
	}

	static async checkProductAvailability(merchantId: string, productId: string, quantity: number): Promise<ApiResponse> {
		const product = await this.getMerchantProduct(merchantId, productId);

		let reason: string | null = null;
		if (product.isActive === false || product.inventory <= 0) {
			reason = "Product is unavailable";
		} else if (quantity > product.inventory) {
			reason = "Requested quantity exceeds available stock";
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: {
				available: reason === null,
				reason,
				inventory: product.inventory,
				minQuantity: product.minQuantity,
				maxQuantity: product.maxQuantity,
				requiresPrescription: Boolean(product.requiresPrescription),
			},
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

	/**
	 * Adds a live `available`/`availabilityReason` per item (not persisted) by re-checking stock
	 * against the merchant service, mirroring checkProductAvailability's rules. A cart item's
	 * snapshot can go stale between add-time and view-time, so this is what lets the frontend grey
	 * out an item the way the "Order Items" review screen expects. Fails open on a transient
	 * merchant-service error — a stock-check hiccup shouldn't block the cart from rendering.
	 */
	private static async annotateCartAvailability(cart: DrugstoreCart): Promise<any> {
		const items = (cart.items || []) as DrugstoreCartItem[];
		const annotatedItems = await Promise.all(
			items.map(async (item) => {
				const plain = item.toJSON();
				try {
					const product = await this.getMerchantProduct(item.merchantId, item.merchantProductId);
					const unavailable = product.isActive === false || product.inventory <= 0;
					const overStock = !unavailable && item.quantity > product.inventory;
					const available = !unavailable && !overStock;
					return {
						...plain,
						available,
						availabilityReason: unavailable ? "Product is unavailable" : overStock ? "Requested quantity exceeds available stock" : null,
					};
				} catch (_error) {
					return { ...plain, available: true, availabilityReason: null };
				}
			})
		);

		return { ...cart.toJSON(), items: annotatedItems };
	}

	static async getCart(userId: number, merchantId?: string): Promise<ApiResponse> {
		if (merchantId) {
			const cart = await DrugstoreCart.findOne({
				where: { userId, merchantId, status: "active" },
				include: [{ model: DrugstoreCartItem, as: "items" }],
				order: [["createdAt", "DESC"]],
			});

			return {
				status: true,
				code: 200,
				message: RESPONSE_MESSAGES.SUCCESSS,
				data: cart ? await this.annotateCartAvailability(cart) : null,
			};
		}

		// No merchantId — list every pharmacy the caller currently has an active cart at.
		const carts = await DrugstoreCart.findAll({
			where: { userId, status: "active" },
			include: [{ model: DrugstoreCartItem, as: "items" }],
			order: [["createdAt", "DESC"]],
		});

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: await Promise.all(carts.map((cart) => this.annotateCartAvailability(cart))),
		};
	}

	static async addCartItem(userId: number, payload: AddCartItemDTO): Promise<ApiResponse> {
		const product = await this.getMerchantProduct(payload.merchantId, payload.merchantProductId);

		if (product.isActive === false || product.inventory <= 0) {
			return { status: false, code: 400, message: "Product is unavailable" };
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
			try {
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
			} catch (error: any) {
				// (cart_id, merchant_product_id) is unique — a double-tapped "Add to Cart" can lose
				// this exact race between the findOne above and this create. Fall back to updating
				// the row the other request just won, instead of crashing the loser with a 500.
				if (error?.name !== "SequelizeUniqueConstraintError") throw error;
				item = await DrugstoreCartItem.findOne({ where: { cartId: cart.id, merchantProductId: payload.merchantProductId } });
				if (!item) throw error;
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
		const sequelize = DrugstoreOrder.sequelize;
		if (!sequelize) {
			throw new Error("Database not initialized");
		}

		// Claim the cart atomically before doing any payment-affecting work: lock the row, flip it
		// out of "active" immediately, and commit that alone in a short transaction. A concurrent
		// checkout call for the same cart (double-tap, or a client retry racing this request) either
		// blocks on the row lock and then finds the cart no longer "active" (Postgres re-checks the
		// WHERE clause against the post-commit row once the lock is granted), or — for the
		// no-merchantId "exactly one active cart" path — sees the now-claimed cart simply absent
		// from the active list. Either way it correctly gets "No active cart found" instead of also
		// creating an order from the same cart contents.
		let cart: DrugstoreCart | null;
		let items: DrugstoreCartItem[];
		const claimTransaction = await sequelize.transaction();
		try {
			// No `include` here: Postgres rejects `SELECT ... FOR UPDATE` combined with an outer
			// join ("FOR UPDATE cannot be applied to the nullable side of an outer join"), which a
			// hasMany include produces by default. Items are fetched separately below instead.
			if (payload.merchantId) {
				cart = await DrugstoreCart.findOne({
					where: { userId, merchantId: payload.merchantId, status: "active" },
					order: [["createdAt", "DESC"]],
					transaction: claimTransaction,
					lock: true,
				});
			} else {
				const activeCarts = await DrugstoreCart.findAll({
					where: { userId, status: "active" },
					order: [["createdAt", "DESC"]],
					transaction: claimTransaction,
					lock: true,
				});
				if (activeCarts.length > 1) {
					await claimTransaction.rollback();
					return {
						status: false,
						code: 400,
						message: "You have active carts at more than one pharmacy — specify merchantId to check out.",
					};
				}
				cart = activeCarts[0] || null;
			}

			if (!cart) {
				await claimTransaction.rollback();
				return { status: false, code: 404, message: "No active cart found" };
			}

			items = await DrugstoreCartItem.findAll({ where: { cartId: cart.id }, transaction: claimTransaction });
			if (items.length === 0) {
				await claimTransaction.rollback();
				return { status: false, code: 400, message: "Cart is empty" };
			}

			await cart.update({ status: "pending_checkout" }, { transaction: claimTransaction });
			await claimTransaction.commit();
		} catch (error) {
			if (!(claimTransaction as any).finished) {
				await claimTransaction.rollback();
			}
			throw error;
		}

		// From here on the cart is already claimed (status "pending_checkout"), so every failure
		// path below must revert it back to "active" before returning — thrown as CheckoutError so
		// the single outer catch can do that revert uniformly instead of repeating it at each site.
		let transaction: Transaction | null = null;
		try {
			const fulfillmentMethod = payload.fulfillmentMethod === "pickup" ? "pickup" : "delivery";
			const isPickup = fulfillmentMethod === "pickup";

			const address = isPickup ? null : await this.resolveDeliveryAddress(userId, payload.addressId);
			if (!isPickup && !address) {
				throw new CheckoutError(400, "A delivery address is required");
			}

			const latestSnapshots: Array<Partial<DrugstoreOrderItem>> = [];
			let requiresPrescription = false;
			for (const item of items) {
				const product = await this.getMerchantProduct(cart.merchantId, item.merchantProductId);
				if (product.isActive === false || product.inventory <= 0) {
					throw new CheckoutError(400, `Product ${product.name} is unavailable`);
				}
				if (item.quantity > product.inventory) {
					throw new CheckoutError(400, `Insufficient stock for ${product.name}`);
				}
				if (item.quantity < product.minQuantity || item.quantity > product.maxQuantity) {
					throw new CheckoutError(400, `Quantity for ${product.name} must be between ${product.minQuantity} and ${product.maxQuantity}`);
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
					throw new CheckoutError(400, "Prescription approval is required before checkout can continue");
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

			const deliveryFee = isPickup ? 0 : await this.calculateDeliveryFee(cart.merchantId);
			const totalAmount = roundMoney(subtotal + vatTotal - discountTotal + deliveryFee);
			const user = await User.findByPk(userId);
			const isPayInStore = payload.paymentMethod === "pay_in_store";
			if (!user?.email && !isPayInStore) {
				throw new CheckoutError(400, "User email is required to initialize payment");
			}

			const sourceOrderId = crypto.randomUUID();
			const reference = `drg_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
			const channels = payload.paymentMethod === "bank_transfer" ? ["bank_transfer"] : ["card"];
			const isWalletPayment = payload.paymentMethod === "wallet";
			const isSavedCardPayment = payload.paymentMethod === "card" && Boolean(payload.savedCardId);

			let savedCardAuthorizationCode: string | null = null;
			if (isSavedCardPayment) {
				savedCardAuthorizationCode = await DrugstoreSavedCardService.getDecryptedAuthorizationCode(userId, payload.savedCardId!);
				if (!savedCardAuthorizationCode) {
					throw new CheckoutError(404, "Saved card not found");
				}
			}

			const orderCode = await this.generateUniqueOrderCode();

			transaction = await sequelize.transaction();
			if (isWalletPayment) {
				const walletDebit = await DrugstoreWalletService.debitForOrder(
					userId,
					Math.round(totalAmount * 100),
					sourceOrderId,
					reference,
					transaction
				);
				if (!walletDebit.success) {
					await transaction.rollback();
					throw new CheckoutError(400, walletDebit.message || "Wallet payment failed");
				}
			}

			const initialPaymentStatus = isWalletPayment ? PAYMENT_PAID : PAYMENT_PENDING;

			const order = await DrugstoreOrder.create(
				{
					sourceOrderId,
					orderCode,
					userId,
					userRoleSnapshot: userRole === AUTH_ROLE.DOCTOR ? AUTH_ROLE.DOCTOR : AUTH_ROLE.CONSUMER,
					cartId: cart.id,
					merchantId: cart.merchantId,
					merchantOrderId: null,
					fulfillmentMethod,
					paymentMethod: payload.paymentMethod,
					paymentReference: reference,
					paymentStatus: initialPaymentStatus,
					paymentVerifiedAt: isWalletPayment ? new Date() : null,
					deliveryStatus: DELIVERY_PENDING,
					merchantSyncStatus: SYNC_PENDING,
					merchantSyncKey: isWalletPayment ? `${sourceOrderId}:${reference}` : null,
					merchantSyncAttempts: 0,
					merchantSyncedAt: null,
					merchantSyncLastError: null,
					discountCode,
					discountIdSnapshot,
					addressId: address?.id || null,
					prescriptionId: prescription?.id || null,
					subtotal,
					vatTotal,
					discountTotal,
					deliveryFee,
					totalAmount,
					currency: "NGN",
					recipientName: address?.recipientName || null,
					recipientPhone: address?.recipientPhone || null,
					addressLine1: address?.addressLine1 || null,
					addressLine2: address?.addressLine2 || null,
					city: address?.city || null,
					state: address?.state || null,
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
				toStatus: initialPaymentStatus,
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

			await cart.update({ status: isWalletPayment ? "checked_out" : "pending_checkout" }, { transaction });

			if (isWalletPayment) {
				await this.enqueueSyncEvent(order, transaction);
			}

			await transaction.commit();

			if (isWalletPayment) {
				void this.processPendingSyncEvents();

				const result = await DrugstoreOrder.findByPk(order.id, {
					include: [{ model: DrugstoreOrderItem, as: "items" }],
				});

				return {
					status: true,
					code: 201,
					message: "Order created and paid from wallet successfully",
					data: {
						order: result,
						payment: { method: "wallet", status: "paid", amount: totalAmount, currency: "NGN" },
					},
				};
			}

			if (isSavedCardPayment) {
				await DrugstorePaystackService.chargeAuthorization(user.email, Math.round(totalAmount * 100), savedCardAuthorizationCode!, reference, {
					type: "drugstore_order",
					orderId: order.id,
					sourceOrderId: order.sourceOrderId,
					merchantId: cart.merchantId,
					userId,
				});

				const confirmResult = await this.confirmOrderPayment(userId, order.id, { paymentReference: reference });
				return {
					status: confirmResult.status,
					code: confirmResult.status ? 201 : confirmResult.code || 400,
					message: confirmResult.message,
					data: confirmResult.status
						? { order: confirmResult.data, payment: { method: "card", savedCardId: payload.savedCardId, status: "paid" } }
						: undefined,
				};
			}

			if (isPayInStore) {
				const result = await DrugstoreOrder.findByPk(order.id, {
					include: [{ model: DrugstoreOrderItem, as: "items" }],
				});

				return {
					status: true,
					code: 201,
					message: "Order created successfully — pay at pickup",
					data: {
						order: result,
						payment: { method: "pay_in_store", status: "pending", amount: totalAmount, currency: "NGN" },
					},
				};
			}

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
					saveCard: Boolean(payload.saveCard),
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
			if (transaction && !(transaction as any).finished) {
				await transaction.rollback();
			}
			try {
				await cart.update({ status: "active" });
			} catch (_error) {}

			if (error instanceof CheckoutError) {
				return { status: false, code: error.code, message: error.message };
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

		if (verification.metadata?.saveCard && verification.authorization?.reusable) {
			try {
				await DrugstoreSavedCardService.saveCardFromAuthorization(userId, verification.authorization);
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

		// Atomic conditional update: re-checks "still pending and unsynced" at write time, not just
		// at the read above — so a confirmOrderPayment call landing in the gap between this read and
		// write can't get silently clobbered. If it already flipped paymentStatus/merchantSyncStatus,
		// this simply matches zero rows instead of cancelling an order that was actually just paid.
		const [affectedCount] = await DrugstoreOrder.update(
			{ deliveryStatus: DELIVERY_CANCELLED, cancelledAt: new Date() },
			{
				where: {
					id: orderId,
					userId,
					paymentStatus: PAYMENT_PENDING,
					merchantSyncStatus: SYNC_PENDING,
					deliveryStatus: { [Op.ne]: DELIVERY_CANCELLED },
				},
			}
		);

		if (affectedCount === 0) {
			const latest = await DrugstoreOrder.findByPk(orderId);
			if (latest?.deliveryStatus === DELIVERY_CANCELLED) {
				return { status: true, code: 200, message: "Order already cancelled", data: latest };
			}
			return { status: false, code: 400, message: "Only unpaid and unsynced orders can be cancelled" };
		}

		const updated = await DrugstoreOrder.findByPk(orderId);
		await this.createStatusHistory({
			orderId: order.id,
			statusType: "delivery",
			fromStatus: order.deliveryStatus,
			toStatus: DELIVERY_CANCELLED,
			actorType: "user",
			actorId: String(userId),
			note: payload.reason || null,
		});

		return {
			status: true,
			code: 200,
			message: "Order cancelled successfully",
			data: updated,
		};
	}

	static async syncMerchantOrderStatus(payload: {
		sourceOrderId?: string;
		merchantOrderId?: string;
		deliveryStatus?: "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";
		paymentStatus?: "paid";
		note?: string;
	}) {
		const sourceOrderId = String(payload.sourceOrderId || "").trim();
		const merchantOrderId = String(payload.merchantOrderId || "").trim();
		const deliveryStatus = payload.deliveryStatus;
		const paymentStatus = payload.paymentStatus;

		if (!sourceOrderId && !merchantOrderId) {
			return { status: false, code: 400, message: "sourceOrderId or merchantOrderId is required" };
		}

		if (!deliveryStatus && !paymentStatus) {
			return { status: false, code: 400, message: "deliveryStatus or paymentStatus is required" };
		}

		const order = await DrugstoreOrder.findOne({
			where: sourceOrderId ? { sourceOrderId } : { merchantOrderId },
		});
		if (!order) {
			return { status: false, code: 404, message: "Order not found" };
		}

		// Marks a "pay in store" pickup order as paid once the pharmacy confirms in-person
		// payment, then enqueues it for the same reflect-order sync every other paid order uses.
		if (paymentStatus === "paid" && order.paymentStatus !== PAYMENT_PAID) {
			if (order.paymentMethod !== "pay_in_store") {
				return { status: false, code: 400, message: "Only pay_in_store orders can be confirmed paid via this endpoint" };
			}

			const previousPayment = order.paymentStatus;
			const syncKey = `${order.sourceOrderId}:${order.paymentReference}`;
			await order.update({ paymentStatus: PAYMENT_PAID, paymentVerifiedAt: new Date(), merchantSyncKey: syncKey, merchantSyncStatus: SYNC_PENDING });
			await this.createStatusHistory({
				orderId: order.id,
				statusType: "payment",
				fromStatus: previousPayment,
				toStatus: PAYMENT_PAID,
				actorType: "merchant",
				actorId: merchantOrderId || null,
				note: payload.note || "Confirmed paid in store",
			});
			await this.enqueueSyncEvent(order);
			void this.processPendingSyncEvents();
		}

		if (deliveryStatus && order.deliveryStatus !== deliveryStatus) {
			const previousDelivery = order.deliveryStatus;
			await order.update({ deliveryStatus });
			await this.createStatusHistory({
				orderId: order.id,
				statusType: "delivery",
				fromStatus: previousDelivery,
				toStatus: deliveryStatus,
				actorType: "merchant",
				actorId: merchantOrderId || null,
				note: payload.note || null,
			});
		} else if (!paymentStatus) {
			return {
				status: true,
				code: 200,
				message: "Order status already synchronized",
				data: order,
			};
		}

		const result = await DrugstoreOrder.findByPk(order.id);

		return {
			status: true,
			code: 200,
			message: "Order status synchronized successfully",
			data: result,
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

				if (attempts >= maxAttempts) {
					await this.handlePermanentSyncFailure(order, message);
				}
			}
		}
	}

	/**
	 * Once a sync event has exhausted every retry, the order will never reach the merchant — most
	 * commonly because the item went out of stock between checkout and sync (payment happens first,
	 * the real stock decrement only happens here). Without this, the customer's money is simply
	 * gone with no path back: the order sits paid/sync-failed forever. Wallet payments are refunded
	 * automatically since that's a same-system, immediate credit; card/bank_transfer/pay_in_store
	 * can't be auto-refunded from here (no Paystack refund integration exists yet), so those are
	 * just flagged clearly in status history for manual/support follow-up.
	 */
	private static async handlePermanentSyncFailure(order: DrugstoreOrder, reason: string): Promise<void> {
		if (order.deliveryStatus === DELIVERY_CANCELLED) return;

		let refundNote = "Manual refund required — this payment method has no automatic refund path yet.";
		if (order.paymentMethod === "wallet") {
			try {
				const { refunded } = await DrugstoreWalletService.refundForFailedOrder(
					order.userId,
					Math.round(toNumber(order.totalAmount) * 100),
					order.id,
					`refund_${order.paymentReference}`
				);
				refundNote = refunded ? "Wallet refunded automatically." : "Wallet refund already recorded for this order.";
			} catch (refundError: any) {
				refundNote = `Automatic wallet refund failed: ${refundError?.message || refundError}. Manual refund required.`;
			}
		}

		const previousDelivery = order.deliveryStatus;
		await order.update({ deliveryStatus: DELIVERY_CANCELLED, cancelledAt: new Date() });
		await this.createStatusHistory({
			orderId: order.id,
			statusType: "delivery",
			fromStatus: previousDelivery,
			toStatus: DELIVERY_CANCELLED,
			actorType: "system",
			note: `Auto-cancelled after permanent merchant sync failure: ${reason}. ${refundNote}`,
		});
	}
}
