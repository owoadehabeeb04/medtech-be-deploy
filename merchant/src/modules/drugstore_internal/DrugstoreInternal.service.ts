import { Op, Transaction } from "sequelize";
import { HttpException } from "@medtech/utils";
import { Category } from "../categories/Category.model";
import { Discount } from "../discounts/Discount.model";
import { DiscountService } from "../discounts/Discount.service";
import { Product } from "../products/Product.model";
import { ProductStatus } from "../../constants/enums";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { DrugstoreOrder } from "../drugstore_orders/DrugstoreOrder.model";
import { DrugstoreOrderItem } from "../drugstore_orders/DrugstoreOrderItem.model";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";

type ListProductsInput = {
  merchantId: string;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "price" | "name";
  sortDirection?: "asc" | "desc";
};

type MerchantPaymentStatus = "pending" | "paid" | "failed";
type MerchantDeliveryStatus = "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";

type ReflectOrderPayload = {
  sourceOrderId: string;
  sourceSyncKey: string;
  paymentReference: string;
  paymentVerifiedAt?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  merchantId: string;
  user: { id: number; role: "consumer" | "doctor" };
  amounts: {
    subtotal: number;
    vatTotal: number;
    discountTotal: number;
    deliveryFee: number;
    totalAmount: number;
    currency: string;
  };
  delivery: {
    recipientName: string;
    recipientPhone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    landmark?: string | null;
    deliveryNote?: string | null;
    deliveryDate?: string | null;
    deliveryTimeSlot?: string | null;
  };
  discount?: {
    code?: string | null;
    discountId?: string | null;
  };
  items: Array<{
    merchantProductId: string;
    skuSnapshot?: string | null;
    productNameSnapshot: string;
    descriptionSnapshot?: string | null;
    brandSnapshot?: string | null;
    categorySnapshot?: string | null;
    imageUrlSnapshot?: string | null;
    unitPriceSnapshot: number;
    vatSnapshot: number;
    discountPercentageSnapshot: number;
    requiresPrescriptionSnapshot?: boolean;
    quantity: number;
    lineSubtotal: number;
    lineVatTotal: number;
    lineDiscountTotal: number;
    lineTotal: number;
  }>;
  placedAt?: string;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const PAYMENT_STATUS_VALUES: MerchantPaymentStatus[] = ["pending", "paid", "failed"];
const DELIVERY_STATUS_VALUES: MerchantDeliveryStatus[] = [
  "pending",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
];

const toCanonicalValue = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const resolvePaymentStatus = (value?: string): MerchantPaymentStatus => {
  const normalized = toCanonicalValue(value);
  if ((PAYMENT_STATUS_VALUES as string[]).includes(normalized)) {
    return normalized as MerchantPaymentStatus;
  }
  return "paid";
};

const resolveDeliveryStatus = (value?: string): MerchantDeliveryStatus => {
  const normalized = toCanonicalValue(value);
  const aliasMap: Record<string, MerchantDeliveryStatus> = {
    pickedup: "picked_up",
    intransit: "in_transit",
    canceled: "cancelled",
  };
  const candidate = aliasMap[normalized] || normalized;
  if ((DELIVERY_STATUS_VALUES as string[]).includes(candidate)) {
    return candidate as MerchantDeliveryStatus;
  }
  return "pending";
};

const resolveLegacyOrderStatus = (
  deliveryStatus: MerchantDeliveryStatus
): "new" | "processing" | "ready" | "delivered" | "cancelled" => {
  if (deliveryStatus === "delivered") return "delivered";
  if (deliveryStatus === "cancelled") return "cancelled";
  if (deliveryStatus === "picked_up" || deliveryStatus === "in_transit") return "ready";
  return "new";
};

export class DrugstoreInternalService {
  static async listProducts(input: ListProductsInput) {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const offset = (page - 1) * limit;

    const where: any = {
      merchantId: input.merchantId,
      isActive: true,
    };

    if (input.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${input.search}%` } },
        { brand: { [Op.iLike]: `%${input.search}%` } },
        { sku: { [Op.iLike]: `%${input.search}%` } },
      ];
    }

    if (input.category) {
      where.category = input.category;
    }

    const sortBy = input.sortBy || "createdAt";
    const sortDirection = input.sortDirection === "asc" ? "ASC" : "DESC";
    const order = [[sortBy, sortDirection]] as any;

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order,
    });

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getProduct(merchantId: string, productId: string) {
    const product = await Product.findOne({
      where: { merchantId, id: productId, isActive: true },
    });

    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    return product;
  }

  static async listNearbyPharmacies(input: {
    search?: string;
    page?: number;
    limit?: number;
    activeCartMerchantId?: string;
    activeCartItemCount?: number;
    activeCartSubtotal?: number;
  }) {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const offset = (page - 1) * limit;

    const where: any = { isActive: true, onboardingCompleted: true };
    if (input.search) {
      where[Op.or] = [
        { "$storeDetails.business_name$": { [Op.iLike]: `%${input.search}%` } },
        { "$storeDetails.city$": { [Op.iLike]: `%${input.search}%` } },
        { "$storeDetails.state$": { [Op.iLike]: `%${input.search}%` } },
      ];
    }

    const { rows, count } = await Merchant.findAndCountAll({
      where,
      include: [
        { model: StoreDetails, required: false },
        { model: MerchantSettings, as: "settings", required: false },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const items = rows
      .filter((merchant) => merchant.settings?.storePreferences?.enableInHouseDelivery !== false)
      .map((merchant) => {
        const store = merchant.storeDetails;
        const settings = merchant.settings?.storePreferences;
        return {
          id: merchant.id,
          businessName: store?.businessName || merchant.fullName,
          profilePictureUrl: merchant.profilePictureUrl || null,
          bannerUrl: store?.storeBannerUrl || null,
          businessAddress: store?.businessAddress || null,
          city: store?.city || null,
          state: store?.state || null,
          landmark: store?.landmark || null,
          openHour: store?.openHour || null,
          closeHour: store?.closeHour || null,
          isOpen: !store?.vacation,
          deliveryFeePreview: toNumber(settings?.deliveryFlatFee || 0),
          supportsDelivery: Boolean(settings?.enableInHouseDelivery),
          supportsPickup: Boolean(settings?.enablePharmacyPickup),
          ratingSummary: {
            averageRating: 0,
            reviewCount: 0,
          },
          cartCompatibility:
            input.activeCartMerchantId && input.activeCartMerchantId === merchant.id
              ? {
                  supported: true,
                  itemCount: toNumber(input.activeCartItemCount),
                  subtotal: toNumber(input.activeCartSubtotal),
                }
              : null,
        };
      });

    return {
      items,
      pagination: {
        total: items.length,
        page,
        limit,
        totalPages: Math.ceil(items.length / limit),
      },
    };
  }

  static async getPharmacyProfile(merchantId: string) {
    const merchant = await Merchant.findOne({
      where: { id: merchantId, isActive: true, onboardingCompleted: true },
      include: [
        { model: StoreDetails, required: false },
        { model: MerchantSettings, as: "settings", required: false },
      ],
    });

    if (!merchant) {
      throw new HttpException(404, "Pharmacy not found");
    }

    const store = merchant.storeDetails;
    const settings = merchant.settings?.storePreferences;
    return {
      id: merchant.id,
      businessName: store?.businessName || merchant.fullName,
      description: store?.storeDescription || "",
      bannerUrl: store?.storeBannerUrl || merchant.profilePictureUrl || null,
      profilePictureUrl: merchant.profilePictureUrl || null,
      phoneNumber: `${merchant.phoneCountryCode || ""}${merchant.phoneNumber || ""}`,
      address: {
        line1: store?.businessAddress || null,
        city: store?.city || null,
        state: store?.state || null,
        landmark: store?.landmark || null,
      },
      operations: {
        openHour: store?.openHour || null,
        closeHour: store?.closeHour || null,
        isOnVacation: Boolean(store?.vacation),
        supportsDelivery: Boolean(settings?.enableInHouseDelivery),
        supportsPickup: Boolean(settings?.enablePharmacyPickup),
      },
      settings: {
        enableInHouseDelivery: Boolean(settings?.enableInHouseDelivery),
        enablePharmacyPickup: Boolean(settings?.enablePharmacyPickup),
        deliveryFeeType: settings?.deliveryFeeType || "flat",
        deliveryFlatFee: toNumber(settings?.deliveryFlatFee),
        deliveryPricePerKm: toNumber(settings?.deliveryPricePerKm),
      },
      ratingSummary: {
        averageRating: 0,
        reviewCount: 0,
      },
    };
  }

  static async getPharmacyReviews(merchantId: string, page?: number, limit?: number) {
    await this.getPharmacyProfile(merchantId);
    return {
      items: [] as Array<Record<string, never>>,
      pagination: {
        total: 0,
        page: Math.max(1, Number(page || 1)),
        limit: Math.max(1, Math.min(100, Number(limit || 20))),
        totalPages: 0,
      },
      summary: {
        averageRating: 0,
        reviewCount: 0,
      },
    };
  }

  static async listCategories(merchantId: string) {
    return Category.findAll({
      where: { merchantId, isActive: true },
      order: [
        ["isDefault", "DESC"],
        ["name", "ASC"],
      ],
    });
  }

  static async validateDiscount(payload: {
    merchantId: string;
    code: string;
    orderAmount: number;
    productIds: string[];
  }) {
    return DiscountService.validateDiscountCode(payload.merchantId, {
      code: payload.code,
      orderAmount: payload.orderAmount,
      productIds: payload.productIds,
    });
  }

  private static resolveProductStatus(inventory: number, lowStockThreshold: number): ProductStatus {
    if (inventory <= 0) return ProductStatus.OUT_OF_STOCK;
    if (inventory <= lowStockThreshold) return ProductStatus.LOW_STOCK;
    return ProductStatus.IN_STOCK;
  }

  private static async decrementStock(
    merchantId: string,
    items: ReflectOrderPayload["items"],
    transaction: Transaction
  ) {
    const productIds = [...new Set(items.map((item) => item.merchantProductId))];
    const products = await Product.findAll({
      where: {
        merchantId,
        id: { [Op.in]: productIds },
      },
      transaction,
      lock: true,
    });

    if (products.length !== productIds.length) {
      throw new HttpException(409, "Some products no longer exist");
    }

    const settings = await MerchantSettings.findOne({ where: { merchantId }, transaction });
    const lowStockThreshold = settings?.storePreferences?.lowStockThreshold || 10;

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.merchantProductId);
      if (!product) {
        throw new HttpException(409, `Product ${item.merchantProductId} was not found`);
      }

      if (!product.isActive) {
        throw new HttpException(409, `Product ${product.name} is inactive`);
      }

      if (product.inventory < item.quantity) {
        throw new HttpException(409, `Insufficient stock for ${product.name}`);
      }

      const newInventory = product.inventory - item.quantity;
      const nextStatus = this.resolveProductStatus(newInventory, lowStockThreshold);

      await product.update(
        {
          inventory: newInventory,
          status: nextStatus,
        },
        { transaction }
      );
    }
  }

  private static async incrementDiscountUsage(
    merchantId: string,
    discountId: string | null | undefined,
    transaction: Transaction
  ) {
    if (!discountId) return;

    const discount = await Discount.findOne({
      where: { id: discountId, merchantId },
      transaction,
      lock: true,
    });

    if (!discount) {
      throw new HttpException(409, "Discount no longer exists");
    }

    await discount.update({ usageCount: discount.usageCount + 1 }, { transaction });
  }

  static async reflectPaidOrder(payload: ReflectOrderPayload) {
    if (!payload.sourceOrderId || !payload.sourceSyncKey || !payload.paymentReference) {
      throw new HttpException(400, "sourceOrderId, sourceSyncKey and paymentReference are required");
    }

    if (!payload.merchantId) {
      throw new HttpException(400, "merchantId is required");
    }

    if (!payload.items || payload.items.length === 0) {
      throw new HttpException(400, "Order items are required");
    }

    const existingBySyncKey = await DrugstoreOrder.findOne({ where: { sourceSyncKey: payload.sourceSyncKey } });
    if (existingBySyncKey) {
      return {
        merchantOrderId: existingBySyncKey.id,
        sourceOrderId: existingBySyncKey.sourceOrderId,
        idempotent: true,
      };
    }

    const existingBySourceOrder = await DrugstoreOrder.findOne({ where: { sourceOrderId: payload.sourceOrderId } });
    if (existingBySourceOrder) {
      return {
        merchantOrderId: existingBySourceOrder.id,
        sourceOrderId: existingBySourceOrder.sourceOrderId,
        idempotent: true,
      };
    }

    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    let createdOrder: DrugstoreOrder;
    try {
      createdOrder = await sequelize.transaction(async (transaction) => {
        await this.decrementStock(payload.merchantId, payload.items, transaction);
        await this.incrementDiscountUsage(payload.merchantId, payload.discount?.discountId, transaction);

        const paymentStatus = resolvePaymentStatus(payload.paymentStatus);
        const deliveryStatus = resolveDeliveryStatus(payload.deliveryStatus);
        const paymentVerifiedAt = toValidDate(payload.paymentVerifiedAt) || new Date();
        const placedAt = toValidDate(payload.placedAt) || paymentVerifiedAt;

        const order = await DrugstoreOrder.create(
          {
            merchantId: payload.merchantId,
            sourceOrderId: payload.sourceOrderId,
            sourceSyncKey: payload.sourceSyncKey,
            paymentReference: payload.paymentReference,
            sourceUserId: payload.user.id,
            sourceUserRole: payload.user.role,
            paymentVerifiedAt,
            paymentStatus,
            deliveryStatus,
            placedAt,
            subtotal: toNumber(payload.amounts?.subtotal),
            vatTotal: toNumber(payload.amounts?.vatTotal),
            discountTotal: toNumber(payload.amounts?.discountTotal),
            deliveryFee: toNumber(payload.amounts?.deliveryFee),
            totalAmount: toNumber(payload.amounts?.totalAmount),
            currency: payload.amounts?.currency || "NGN",
            discountCode: payload.discount?.code || null,
            discountId: payload.discount?.discountId || null,
            recipientName: payload.delivery?.recipientName,
            recipientPhone: payload.delivery?.recipientPhone,
            addressLine1: payload.delivery?.addressLine1,
            addressLine2: payload.delivery?.addressLine2 || null,
            city: payload.delivery?.city,
            state: payload.delivery?.state,
            landmark: payload.delivery?.landmark || null,
            deliveryNote: payload.delivery?.deliveryNote || null,
            deliveryDate: payload.delivery?.deliveryDate || null,
            deliveryTimeSlot: payload.delivery?.deliveryTimeSlot || null,
            status: resolveLegacyOrderStatus(deliveryStatus),
            metadata: {
              placedAt,
            },
          },
          { transaction }
        );

        for (const item of payload.items) {
          await DrugstoreOrderItem.create(
            {
              orderId: order.id,
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

        return order;
      });
    } catch (error: any) {
      if (error?.name === "SequelizeUniqueConstraintError") {
        const existing = await DrugstoreOrder.findOne({
          where: {
            [Op.or]: [{ sourceSyncKey: payload.sourceSyncKey }, { sourceOrderId: payload.sourceOrderId }],
          },
        });
        if (existing) {
          return {
            merchantOrderId: existing.id,
            sourceOrderId: existing.sourceOrderId,
            idempotent: true,
          };
        }
      }
      throw error;
    }

    return {
      merchantOrderId: createdOrder.id,
      sourceOrderId: createdOrder.sourceOrderId,
      idempotent: false,
    };
  }
}
