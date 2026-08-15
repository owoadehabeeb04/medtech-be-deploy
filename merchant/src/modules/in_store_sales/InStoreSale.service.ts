import { HttpException } from "@medtech/utils";
import { createHash, randomUUID } from "crypto";
import { Op, Transaction, cast, col, literal, where as sequelizeWhere } from "sequelize";
import { applicationConfig } from "../../config";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Product } from "../products/Product.model";
import { ProductStatus } from "../../constants/enums";
import { DrugstoreOrder } from "../drugstore_orders/DrugstoreOrder.model";
import { DrugstoreOrderItem } from "../drugstore_orders/DrugstoreOrderItem.model";

type PaymentStatus = "pending" | "paid" | "failed";
type DeliveryStatus = "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";
type LegacyOrderStatus = "new" | "processing" | "ready" | "delivered" | "cancelled";
type ReturnCondition = "resalable" | "damaged";
type RefundMethod = "cash" | "pos" | "bank_transfer" | "other";
type ResolutionStatus = "active" | "cancelled" | "partially_returned" | "returned";
type RefundStatus = "not_required" | "pending" | "partially_refunded" | "completed";

type InStoreOrderItemInput = {
  productId: string;
  quantity: number;
};

export type CreateInStoreSaleInput = {
  productId?: string;
  quantity?: number;
  items?: InStoreOrderItemInput[];
  customerName?: string | null;
  customerPhone?: string | null;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus | "completed";
  note?: string | null;
  idempotencyKey?: string | null;
};

export type ListInStoreSalesInput = {
  merchantId: string;
  page?: number | string;
  limit?: number | string;
  search?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  sortBy?: string;
  sortDirection?: string;
};

type CancelInStoreSaleInput = {
  reason: string;
  idempotencyKey: string;
};

type ReturnInStoreSaleItemInput = {
  orderItemId: string;
  quantity: number;
  condition: ReturnCondition;
};

type ReturnInStoreSaleInput = {
  items: ReturnInStoreSaleItemInput[];
  reason: string;
  idempotencyKey: string;
};

type RefundInStoreSaleInput = {
  amount?: number;
  method: RefundMethod;
  reference?: string | null;
  note?: string | null;
  idempotencyKey: string;
};

type InStoreReturnRecord = {
  returnId: string;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  reason: string;
  items: Array<{
    orderItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    condition: ReturnCondition;
    refundAmount: number;
    inventoryRestored: boolean;
  }>;
  refundAmount: number;
  inventoryRestoredQuantity: number;
  returnedAt: string;
  returnedByMerchantId: string;
};

type InStoreRefundRecord = {
  refundId: string;
  idempotencyKey: string;
  idempotencyFingerprint: string;
  amount: number;
  method: RefundMethod;
  reference: string | null;
  note: string | null;
  refundedAt: string;
  refundedByMerchantId: string;
};

type InStoreSaleResolution = {
  status: ResolutionStatus;
  refundStatus: RefundStatus;
  expectedRefundAmount: number;
  refundedAmount: number;
  returnedQuantities: Record<string, number>;
  cancellation: {
    idempotencyKey: string;
    idempotencyFingerprint: string;
    reason: string;
    cancelledAt: string;
    cancelledByMerchantId: string;
    inventoryRestoredQuantity: number;
    inventoryRestoredAt: string;
  } | null;
  returns: InStoreReturnRecord[];
  refunds: InStoreRefundRecord[];
};

const IN_STORE_ORIGIN = "in_store";
const APP_TIMEZONE = applicationConfig.timezone || "Africa/Lagos";
const MAX_SALES_PAGE = 100_000;
const MAX_SALES_LIMIT = 100;
const MAX_PRODUCT_OPTION_LIMIT = 50;
const EXPORT_BATCH_SIZE = 1_000;
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];
const DELIVERY_STATUSES: DeliveryStatus[] = [
  "pending",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
];

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const getImageUrl = (product: Product): string | null => {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find((image) => image.isMain)?.url || images[0]?.url || null;
};

const resolveLegacyStatus = (deliveryStatus: DeliveryStatus): LegacyOrderStatus => {
  if (deliveryStatus === "delivered") return "delivered";
  if (deliveryStatus === "cancelled") return "cancelled";
  if (deliveryStatus === "picked_up" || deliveryStatus === "in_transit") return "ready";
  if (deliveryStatus === "pending") return "processing";
  return "new";
};

const normalizeDeliveryStatus = (value?: string): DeliveryStatus | undefined => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "completed") return "delivered";
  if (normalized === "pickedup") return "picked_up";
  if (normalized === "intransit") return "in_transit";
  if (normalized === "canceled") return "cancelled";
  return DELIVERY_STATUSES.includes(normalized as DeliveryStatus)
    ? (normalized as DeliveryStatus)
    : undefined;
};

const normalizePaymentStatus = (value?: string): PaymentStatus | undefined => {
  const normalized = String(value || "").trim().toLowerCase();
  return PAYMENT_STATUSES.includes(normalized as PaymentStatus)
    ? (normalized as PaymentStatus)
    : undefined;
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const displayOrderId = (order: DrugstoreOrder): string => {
  const metadata = order.metadata || {};
  return String(metadata.displayOrderId || `IS-${String(order.id).slice(0, 8).toUpperCase()}`);
};

const customerName = (order: DrugstoreOrder): string => {
  const metadata = order.metadata || {};
  return String(order.recipientName || metadata.customerName || "Walk-in Customer");
};

const formatStatusLabel = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDateParts = (value: unknown): Record<string, string> | null => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
};

const formatDateInAppTimezone = (value: unknown): string => {
  const parts = formatDateParts(value);
  if (!parts) return "";
  return `${parts.day}/${parts.month}/${parts.year}`;
};

const formatTimeInAppTimezone = (value: unknown): string => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.hour}:${parts.minute} ${String(parts.dayPeriod || "").toUpperCase()}`;
};

const parseBoundedInteger = (
  value: unknown,
  fieldName: string,
  defaultValue: number,
  maximum: number
): number => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new HttpException(400, `${fieldName} must be an integer between 1 and ${maximum}`);
  }
  return parsed;
};

const serializeItem = (item: DrugstoreOrderItem) => ({
  id: item.id,
  productId: item.merchantProductId,
  name: item.productNameSnapshot,
  sku: item.skuSnapshot,
  brand: item.brandSnapshot,
  category: item.categorySnapshot,
  imageUrl: item.imageUrlSnapshot,
  quantity: item.quantity,
  unitPrice: toNumber(item.unitPriceSnapshot),
  vat: toNumber(item.vatSnapshot),
  discountPercentage: toNumber(item.discountPercentageSnapshot),
  subtotal: toNumber(item.lineSubtotal),
  vatTotal: toNumber(item.lineVatTotal),
  discountTotal: toNumber(item.lineDiscountTotal),
  totalAmount: toNumber(item.lineTotal),
  amount: toNumber(item.lineTotal),
  requiresPrescription: Boolean(item.requiresPrescriptionSnapshot),
});

const serializeOrder = (order: DrugstoreOrder) => {
  const items = (order.items || []).map(serializeItem);
  const itemQty = items.reduce((total, item) => total + toNumber(item.quantity), 0);
  const deliveryStatus = order.deliveryStatus;
  const resolution = getInStoreResolution(order.metadata);

  return {
    id: order.id,
    orderId: displayOrderId(order),
    sourceOrderId: order.sourceOrderId,
    customerName: customerName(order),
    customerPhone: order.recipientPhone || null,
    orderDate: order.placedAt,
    date: formatDateInAppTimezone(order.placedAt),
    time: formatTimeInAppTimezone(order.placedAt),
    timezone: APP_TIMEZONE,
    itemQty,
    paymentStatus: order.paymentStatus,
    paymentStatusLabel: formatStatusLabel(order.paymentStatus),
    deliveryStatus,
    // The Figma label says “Completed”; the persisted canonical order value
    // remains “delivered” so it is compatible with the existing order flow.
    deliveryStatusLabel: deliveryStatus === "delivered" ? "Completed" : formatStatusLabel(deliveryStatus),
    totalAmount: toNumber(order.totalAmount),
    subtotal: toNumber(order.subtotal),
    vatTotal: toNumber(order.vatTotal),
    discountTotal: toNumber(order.discountTotal),
    deliveryFee: toNumber(order.deliveryFee),
    currency: order.currency,
    note: order.deliveryNote || null,
    fulfillmentMethod: order.fulfillmentMethod,
    isInstoreSales: Boolean(order.isInstoreSales),
    resolution: serializeResolution(resolution),
    items,
    createdAt: order.createdAt,
  };
};

const csvEscape = (value: unknown): string => {
  const asText = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(asText) ? `"${asText.replace(/"/g, '""')}"` : asText;
};

const toIsoString = (value: unknown): string => {
  if (!value) return "";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

const normalizeCreateItems = (input: CreateInStoreSaleInput): InStoreOrderItemInput[] => {
  if (Array.isArray(input.items) && input.items.length > 0) {
    return input.items.map((item) => ({
      productId: String(item.productId || "").trim(),
      quantity: Number(item.quantity),
    }));
  }

  return [
    {
      productId: String(input.productId || "").trim(),
      quantity: Number(input.quantity),
    },
  ];
};

const combineDuplicateItems = (items: InStoreOrderItemInput[]): InStoreOrderItemInput[] => {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const buildIdempotencyFingerprint = (input: {
  items: InStoreOrderItemInput[];
  customerName: string;
  customerPhone: string | null;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  note: string | null;
}): string => {
  const canonicalPayload = {
    items: [...input.items].sort((first, second) => first.productId.localeCompare(second.productId)),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    paymentStatus: input.paymentStatus,
    deliveryStatus: input.deliveryStatus,
    note: input.note,
  };

  return createHash("sha256").update(JSON.stringify(canonicalPayload)).digest("hex");
};

const buildActionFingerprint = (payload: unknown): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createEmptyResolution = (): InStoreSaleResolution => ({
  status: "active",
  refundStatus: "not_required",
  expectedRefundAmount: 0,
  refundedAmount: 0,
  returnedQuantities: {},
  cancellation: null,
  returns: [],
  refunds: [],
});

const getInStoreResolution = (metadata: Record<string, unknown> | null | undefined): InStoreSaleResolution => {
  const raw = isRecord(metadata?.inStoreResolution) ? metadata.inStoreResolution : null;
  if (!raw) return createEmptyResolution();

  const returnedQuantities: Record<string, number> = {};
  if (isRecord(raw.returnedQuantities)) {
    for (const [itemId, quantity] of Object.entries(raw.returnedQuantities)) {
      const normalizedQuantity = Math.max(0, Math.floor(toNumber(quantity)));
      if (normalizedQuantity > 0) returnedQuantities[itemId] = normalizedQuantity;
    }
  }

  const validStatuses: ResolutionStatus[] = ["active", "cancelled", "partially_returned", "returned"];
  const validRefundStatuses: RefundStatus[] = [
    "not_required",
    "pending",
    "partially_refunded",
    "completed",
  ];

  return {
    status: validStatuses.includes(raw.status) ? raw.status : "active",
    refundStatus: validRefundStatuses.includes(raw.refundStatus) ? raw.refundStatus : "not_required",
    expectedRefundAmount: roundMoney(Math.max(0, toNumber(raw.expectedRefundAmount))),
    refundedAmount: roundMoney(Math.max(0, toNumber(raw.refundedAmount))),
    returnedQuantities,
    cancellation: isRecord(raw.cancellation) ? (raw.cancellation as InStoreSaleResolution["cancellation"]) : null,
    returns: Array.isArray(raw.returns) ? (raw.returns as InStoreReturnRecord[]) : [],
    refunds: Array.isArray(raw.refunds) ? (raw.refunds as InStoreRefundRecord[]) : [],
  };
};

const serializeResolution = (resolution: InStoreSaleResolution) => ({
  status: resolution.status,
  refundStatus: resolution.refundStatus,
  expectedRefundAmount: resolution.expectedRefundAmount,
  refundedAmount: resolution.refundedAmount,
  refundableAmount: roundMoney(
    Math.max(0, resolution.expectedRefundAmount - resolution.refundedAmount)
  ),
  returnedQuantities: resolution.returnedQuantities,
  cancellation: resolution.cancellation
    ? {
        reason: resolution.cancellation.reason,
        cancelledAt: resolution.cancellation.cancelledAt,
        cancelledByMerchantId: resolution.cancellation.cancelledByMerchantId,
        inventoryRestoredQuantity: resolution.cancellation.inventoryRestoredQuantity,
        inventoryRestoredAt: resolution.cancellation.inventoryRestoredAt,
      }
    : null,
  returns: resolution.returns.map((record) => ({
    returnId: record.returnId,
    reason: record.reason,
    items: record.items,
    refundAmount: record.refundAmount,
    inventoryRestoredQuantity: record.inventoryRestoredQuantity,
    returnedAt: record.returnedAt,
    returnedByMerchantId: record.returnedByMerchantId,
  })),
  refunds: resolution.refunds.map((record) => ({
    refundId: record.refundId,
    amount: record.amount,
    method: record.method,
    reference: record.reference,
    note: record.note,
    refundedAt: record.refundedAt,
    refundedByMerchantId: record.refundedByMerchantId,
  })),
});

const getActionByIdempotencyKey = <T extends { idempotencyKey: string; idempotencyFingerprint: string }>(
  actions: T[],
  idempotencyKey: string,
  idempotencyFingerprint: string,
  actionName: string
): T | null => {
  const existing = actions.find((action) => action.idempotencyKey === idempotencyKey);
  if (!existing) return null;

  if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
    throw new HttpException(
      409,
      `Idempotency-Key was already used for a different ${actionName} request`
    );
  }

  return existing;
};

const requireActionIdempotencyKey = (value: unknown, actionName: string): string => {
  const key = String(value || "").trim();
  if (!key) {
    throw new HttpException(
      400,
      `Idempotency-Key is required when performing this ${actionName} action`
    );
  }
  if (key.length > 255) {
    throw new HttpException(400, `Idempotency-Key for ${actionName} cannot exceed 255 characters`);
  }
  return key;
};

const resolveProductStatus = (inventory: number, lowStockThreshold: number): ProductStatus => {
  if (inventory <= 0) return ProductStatus.OUT_OF_STOCK;
  if (inventory <= lowStockThreshold) return ProductStatus.LOW_STOCK;
  return ProductStatus.IN_STOCK;
};

/**
 * Build a dialect-escaped SQL string for the small EXISTS predicate used by
 * the sales search. The fallback keeps this helper safe even if it is called
 * before Sequelize has finished initialising the model.
 */
const escapeSearchValue = (value: string): string => {
  const sequelize = DrugstoreOrder.sequelize;
  if (sequelize) {
    return (sequelize as any).dialect.queryGenerator.escape(value);
  }

  return `'${value.replace(/'/g, "''")}'`;
};

const buildListWhere = (input: ListInStoreSalesInput): any => {
  const where: any = {
    merchantId: input.merchantId,
    isInstoreSales: true,
  };
  const andClauses: any[] = [];

  if (input.paymentStatus) {
    const paymentStatus = normalizePaymentStatus(input.paymentStatus);
    if (!paymentStatus) throw new HttpException(400, "Invalid paymentStatus filter");
    andClauses.push({ paymentStatus });
  }

  if (input.deliveryStatus) {
    const deliveryStatus = normalizeDeliveryStatus(input.deliveryStatus);
    if (!deliveryStatus) throw new HttpException(400, "Invalid deliveryStatus filter");
    andClauses.push({ deliveryStatus });
  }

  const search = String(input.search || "").trim();
  if (search) {
    const like = `%${search}%`;
    const searchClauses: any[] = [
      { paymentReference: { [Op.iLike]: like } },
      { recipientName: { [Op.iLike]: like } },
      { recipientPhone: { [Op.iLike]: like } },
      sequelizeWhere(cast(col("DrugstoreOrder.metadata"), "text"), { [Op.iLike]: like }),
      // Do not use `$items.productNameSnapshot$` here. Sequelize places that
      // expression in the paginated parent subquery and emits the model
      // attribute name (`productNameSnapshot`) instead of the physical
      // `product_name_snapshot` column. EXISTS keeps the child search in the
      // parent WHERE clause, works with LIMIT/OFFSET, and supports any number
      // of line items without breaking pagination.
      literal(`EXISTS (
        SELECT 1
        FROM "merchant_drugstore_order_items" AS "search_items"
        WHERE "search_items"."order_id" = "DrugstoreOrder"."id"
          AND (
            "search_items"."product_name_snapshot" ILIKE ${escapeSearchValue(like)}
            OR "search_items"."sku_snapshot" ILIKE ${escapeSearchValue(like)}
          )
      )`),
    ];

    if (isUuid(search)) {
      searchClauses.push({ sourceOrderId: search });
      searchClauses.push({ id: search });
    }

    andClauses.push({ [Op.or]: searchClauses });
  }

  if (andClauses.length > 0) {
    where[Op.and] = andClauses;
  }

  return where;
};

const resolveSort = (sortBy?: string, sortDirection?: string): [string, "ASC" | "DESC"] => {
  const allowedSorts: Record<string, string> = {
    date: "placedAt",
    orderDate: "placedAt",
    placedAt: "placedAt",
    amount: "totalAmount",
    totalAmount: "totalAmount",
    createdAt: "createdAt",
  };
  const requestedSort = String(sortBy || "date");
  const column = allowedSorts[requestedSort];
  if (!column) {
    throw new HttpException(400, "sortBy must be one of: date, amount, createdAt");
  }

  const requestedDirection = String(sortDirection || "desc").toLowerCase();
  if (requestedDirection !== "asc" && requestedDirection !== "desc") {
    throw new HttpException(400, "sortDirection must be asc or desc");
  }

  const direction = requestedDirection === "asc" ? "ASC" : "DESC";
  return [column, direction];
};

export class InStoreSaleService {
  private static async getIdempotentSale(
    merchantId: string,
    sourceSyncKey: string,
    idempotencyFingerprint: string
  ) {
    const existing = await DrugstoreOrder.findOne({
      where: { merchantId, sourceSyncKey, isInstoreSales: true },
      include: [{ model: DrugstoreOrderItem, as: "items" }],
    });

    if (!existing) return null;

    const storedFingerprint = existing.metadata?.idempotencyFingerprint;
    if (storedFingerprint && storedFingerprint !== idempotencyFingerprint) {
      throw new HttpException(409, "Idempotency-Key was already used for a different sale");
    }

    return serializeOrder(existing);
  }

  static async listProductOptions(merchantId: string, search?: string, limit?: number | string) {
    const normalizedSearch = String(search || "").trim();
    const optionLimit = parseBoundedInteger(limit, "limit", 20, MAX_PRODUCT_OPTION_LIMIT);
    const where: any = {
      merchantId,
      isActive: true,
      inventory: { [Op.gt]: 0 },
      status: { [Op.ne]: ProductStatus.OUT_OF_STOCK },
    };

    if (normalizedSearch) {
      const like = `%${normalizedSearch}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: like } },
        { brand: { [Op.iLike]: like } },
        { sku: { [Op.iLike]: like } },
      ];
    }

    const products = await Product.findAll({
      where,
      order: [["name", "ASC"]],
      limit: optionLimit,
    });

    return products.map((product) => {
      const price = roundMoney(toNumber(product.price));
      const vat = roundMoney(toNumber(product.vat));
      const discountPercentage = roundMoney(toNumber(product.discountPercentage));
      const discountedSubtotal = roundMoney(price - (price * discountPercentage) / 100);

      return {
        id: product.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        imageUrl: getImageUrl(product),
        unitPrice: price,
        vat,
        discountPercentage,
        totalUnitPrice: roundMoney(discountedSubtotal + vat),
        inventory: product.inventory,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity,
        requiresPrescription: product.requiresPrescription,
      };
    });
  }

  static async createSale(merchantId: string, input: CreateInStoreSaleInput) {
    const requestedItems = combineDuplicateItems(normalizeCreateItems(input));
    if (
      requestedItems.length === 0 ||
      requestedItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)
    ) {
      throw new HttpException(400, "At least one valid product and quantity are required");
    }

    const paymentStatus = input.paymentStatus || "paid";
    const deliveryStatus = normalizeDeliveryStatus(input.deliveryStatus) || "delivered";
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    if (idempotencyKey.length > 255) {
      throw new HttpException(400, "Idempotency-Key cannot exceed 255 characters");
    }

    const resolvedCustomerName = normalizeText(input.customerName, "Walk-in Customer") as string;
    const resolvedCustomerPhone = normalizeText(input.customerPhone);
    const resolvedNote = normalizeText(input.note);
    const idempotencyFingerprint = buildIdempotencyFingerprint({
      items: requestedItems,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      paymentStatus,
      deliveryStatus,
      note: resolvedNote,
    });
    const sourceSyncKey = idempotencyKey
      ? `in_store:${merchantId}:${idempotencyKey}`
      : `in_store:${merchantId}:${randomUUID()}`;

    if (idempotencyKey) {
      const existingSale = await this.getIdempotentSale(
        merchantId,
        sourceSyncKey,
        idempotencyFingerprint
      );
      if (existingSale) return existingSale;
    }

    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    const sourceOrderId = randomUUID();
    let order: DrugstoreOrder;
    try {
      order = await sequelize.transaction(async (transaction: Transaction) => {
      const productIds = requestedItems.map((item) => item.productId);
      const products = await Product.findAll({
        where: { merchantId, id: { [Op.in]: productIds } },
        transaction,
        lock: true,
      });

      if (products.length !== productIds.length) {
        throw new HttpException(404, "One or more selected products were not found");
      }

      const productMap = new Map(products.map((product) => [product.id, product]));
      const settings = await MerchantSettings.findOne({ where: { merchantId }, transaction });
      const lowStockThreshold = Number(settings?.storePreferences?.lowStockThreshold || 10);
      const builtItems: any[] = [];
      // Collect the changes while validating the order, then persist them on the
      // already-locked Product instances. Updating the instances avoids a partial
      // bulk upsert, which Sequelize may treat as an insert when required fields are
      // omitted (for example, merchant_id).
      const productUpdates: Array<{
        id: string;
        inventory: number;
        status: ProductStatus;
        purchaseCount: number;
      }> = [];

      for (const requestedItem of requestedItems) {
        const product = productMap.get(requestedItem.productId);
        if (!product) {
          throw new HttpException(404, `Product ${requestedItem.productId} was not found`);
        }
        if (!product.isActive) {
          throw new HttpException(409, `Product ${product.name} is inactive`);
        }
        if (requestedItem.quantity < product.minQuantity || requestedItem.quantity > product.maxQuantity) {
          throw new HttpException(
            400,
            `${product.name} quantity must be between ${product.minQuantity} and ${product.maxQuantity}`
          );
        }
        if (product.inventory < requestedItem.quantity) {
          throw new HttpException(409, `Insufficient stock for ${product.name}`);
        }

        const quantity = requestedItem.quantity;
        const unitPriceSnapshot = roundMoney(toNumber(product.price));
        const vatSnapshot = roundMoney(toNumber(product.vat));
        const discountPercentageSnapshot = roundMoney(toNumber(product.discountPercentage));
        const lineSubtotal = roundMoney(unitPriceSnapshot * quantity);
        const lineVatTotal = roundMoney(vatSnapshot * quantity);
        const lineDiscountTotal = roundMoney((lineSubtotal * discountPercentageSnapshot) / 100);
        const lineTotal = roundMoney(lineSubtotal + lineVatTotal - lineDiscountTotal);

        builtItems.push({
          merchantProductId: product.id,
          skuSnapshot: product.sku || null,
          productNameSnapshot: product.name,
          descriptionSnapshot: product.description || null,
          brandSnapshot: product.brand || null,
          categorySnapshot: product.category || null,
          imageUrlSnapshot: getImageUrl(product),
          unitPriceSnapshot,
          vatSnapshot,
          discountPercentageSnapshot,
          requiresPrescriptionSnapshot: Boolean(product.requiresPrescription),
          quantity,
          lineSubtotal,
          lineVatTotal,
          lineDiscountTotal,
          lineTotal,
        });

        const nextInventory = product.inventory - quantity;
        const nextStatus =
          nextInventory <= 0
            ? ProductStatus.OUT_OF_STOCK
            : nextInventory <= lowStockThreshold
              ? ProductStatus.LOW_STOCK
              : ProductStatus.IN_STOCK;

        productUpdates.push({
          id: product.id,
          inventory: nextInventory,
          status: nextStatus,
          purchaseCount: Number(product.purchaseCount || 0) + quantity,
        });
      }

      for (const update of productUpdates) {
        const product = productMap.get(update.id);
        if (!product) {
          throw new HttpException(404, `Product ${update.id} was not found`);
        }

        product.set({
          inventory: update.inventory,
          status: update.status,
          purchaseCount: update.purchaseCount,
        });
        await product.save({ transaction });
      }

      const subtotal = roundMoney(builtItems.reduce((sum, item) => sum + item.lineSubtotal, 0));
      const vatTotal = roundMoney(builtItems.reduce((sum, item) => sum + item.lineVatTotal, 0));
      const discountTotal = roundMoney(builtItems.reduce((sum, item) => sum + item.lineDiscountTotal, 0));
      const totalAmount = roundMoney(subtotal + vatTotal - discountTotal);
      const placedAt = new Date();
      const generatedDisplayOrderId = `IS-${sourceOrderId.slice(0, 8).toUpperCase()}`;
      const createdOrder = await DrugstoreOrder.create(
        {
          merchantId,
          fulfillmentMethod: "pickup",
          sourceOrderId,
          sourceSyncKey,
          paymentReference: `in-store-${generatedDisplayOrderId}`,
          sourceUserId: 0,
          sourceUserRole: "consumer",
          isInstoreSales: true,
          paymentVerifiedAt: placedAt,
          paymentStatus,
          deliveryStatus,
          placedAt,
          subtotal,
          vatTotal,
          discountTotal,
          deliveryFee: 0,
          totalAmount,
          currency: "NGN",
          discountCode: null,
          discountId: null,
          recipientName: resolvedCustomerName,
          recipientPhone: resolvedCustomerPhone,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          landmark: null,
          deliveryNote: resolvedNote,
          deliveryDate: null,
          deliveryTimeSlot: null,
          status: resolveLegacyStatus(deliveryStatus),
          metadata: {
            origin: IN_STORE_ORIGIN,
            channel: "offline",
            displayOrderId: generatedDisplayOrderId,
            customerName: resolvedCustomerName,
            customerPhone: resolvedCustomerPhone,
            createdByMerchantId: merchantId,
            createdAt: placedAt.toISOString(),
            idempotencyFingerprint: idempotencyKey ? idempotencyFingerprint : null,
            inStoreResolution: createEmptyResolution(),
          },
        },
        { transaction }
      );

      await DrugstoreOrderItem.bulkCreate(
        builtItems.map((item) => ({ orderId: createdOrder.id, ...item })),
        { transaction }
      );

      return createdOrder;
      });
    } catch (error: any) {
      const isUniqueConstraintError =
        error?.name === "SequelizeUniqueConstraintError" || error?.parent?.code === "23505";

      if (idempotencyKey && isUniqueConstraintError) {
        // A concurrent request may have inserted the same sourceSyncKey first.
        // Its transaction has now won; return that order instead of retrying the
        // stock decrement or creating a second order.
        const winningSale = await this.getIdempotentSale(
          merchantId,
          sourceSyncKey,
          idempotencyFingerprint
        );
        if (winningSale) return winningSale;
      }

      throw error;
    }

    const completeOrder = await DrugstoreOrder.findOne({
      where: { merchantId, id: order.id },
      include: [{ model: DrugstoreOrderItem, as: "items" }],
    });

    if (!completeOrder) {
      throw new HttpException(500, "In-store sale was created but could not be loaded");
    }

    return serializeOrder(completeOrder);
  }

  private static buildSaleLookup(merchantId: string, orderId: string): any {
    const where: any = {
      merchantId,
      isInstoreSales: true,
    };

    if (isUuid(orderId)) {
      where.id = orderId;
    } else {
      where.metadata = { [Op.contains]: { displayOrderId: orderId } };
    }

    return where;
  }

  private static async findSaleForUpdate(
    merchantId: string,
    orderId: string,
    transaction: Transaction
  ): Promise<DrugstoreOrder> {
    const order = await DrugstoreOrder.findOne({
      where: this.buildSaleLookup(merchantId, orderId),
      include: [{ model: DrugstoreOrderItem, as: "items" }],
      transaction,
      lock: { level: Transaction.LOCK.UPDATE, of: DrugstoreOrder },
    });

    if (!order) {
      throw new HttpException(404, `In-store sale ${orderId} was not found for this merchant`);
    }

    return order;
  }

  private static async restoreInventoryForItems(
    merchantId: string,
    quantitiesByProductId: Map<string, number>,
    transaction: Transaction
  ): Promise<number> {
    const entries = [...quantitiesByProductId.entries()].filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) return 0;

    const productIds = entries.map(([productId]) => productId);
    const products = await Product.findAll({
      where: { merchantId, id: { [Op.in]: productIds } },
      transaction,
      lock: true,
      paranoid: false,
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const settings = await MerchantSettings.findOne({ where: { merchantId }, transaction });
    const lowStockThreshold = Number(settings?.storePreferences?.lowStockThreshold || 10);
    let restoredQuantity = 0;
    // Collect the changes while validating the products, then persist them on the
    // already-locked Product instances. This avoids a partial bulk upsert being treated
    // as an insert when required fields are omitted.
    const productUpdates: Array<{
      id: string;
      inventory: number;
      status: ProductStatus;
      purchaseCount: number;
    }> = [];

    for (const [productId, quantity] of entries) {
      const product = productMap.get(productId);
      if (!product) {
        throw new HttpException(
          409,
          `Cannot restore inventory for product ${productId} because the product no longer exists`
        );
      }

      const nextInventory = toNumber(product.inventory) + quantity;
      productUpdates.push({
        id: product.id,
        inventory: nextInventory,
        status: resolveProductStatus(nextInventory, lowStockThreshold),
        purchaseCount: Math.max(0, toNumber(product.purchaseCount) - quantity),
      });
      restoredQuantity += quantity;
    }

    for (const update of productUpdates) {
      const product = productMap.get(update.id);
      if (!product) {
        throw new HttpException(
          409,
          `Cannot restore inventory for product ${update.id} because the product no longer exists`
        );
      }

      product.set({
        inventory: update.inventory,
        status: update.status,
        purchaseCount: update.purchaseCount,
      });
      await product.save({ transaction });
    }

    return restoredQuantity;
  }

  private static async reversePurchaseCountForItems(
    merchantId: string,
    quantitiesByProductId: Map<string, number>,
    transaction: Transaction
  ): Promise<void> {
    const entries = [...quantitiesByProductId.entries()].filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) return;

    const productIds = entries.map(([productId]) => productId);
    const products = await Product.findAll({
      where: { merchantId, id: { [Op.in]: productIds } },
      transaction,
      lock: true,
      paranoid: false,
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    // Collect the changes while validating the products, then persist them on the
    // already-locked Product instances. This avoids a partial bulk upsert being treated
    // as an insert when required fields are omitted.
    const productUpdates: Array<{ id: string; purchaseCount: number }> = [];

    for (const [productId, quantity] of entries) {
      const product = productMap.get(productId);
      if (!product) {
        throw new HttpException(
          409,
          `Cannot reverse purchase count for product ${productId} because the product no longer exists`
        );
      }

      productUpdates.push({
        id: product.id,
        purchaseCount: Math.max(0, toNumber(product.purchaseCount) - quantity),
      });
    }

    for (const update of productUpdates) {
      const product = productMap.get(update.id);
      if (!product) {
        throw new HttpException(
          409,
          `Cannot reverse purchase count for product ${update.id} because the product no longer exists`
        );
      }

      product.set({ purchaseCount: update.purchaseCount });
      await product.save({ transaction });
    }
  }

  private static mergeReturnItems(items: ReturnInStoreSaleItemInput[]): ReturnInStoreSaleItemInput[] {
    const merged = new Map<string, ReturnInStoreSaleItemInput>();

    for (const item of items) {
      const existing = merged.get(item.orderItemId);
      if (existing && existing.condition !== item.condition) {
        throw new HttpException(
          400,
          `Returned item ${item.orderItemId} cannot be marked as both resalable and damaged`
        );
      }

      merged.set(item.orderItemId, {
        orderItemId: item.orderItemId,
        quantity: (existing?.quantity || 0) + item.quantity,
        condition: item.condition,
      });
    }

    return [...merged.values()];
  }

  static async cancelSale(merchantId: string, orderId: string, input: CancelInStoreSaleInput) {
    const idempotencyKey = requireActionIdempotencyKey(input.idempotencyKey, "cancellation");
    const reason = String(input.reason || "").trim();
    const idempotencyFingerprint = buildActionFingerprint({ reason });
    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) throw new HttpException(500, "Database not initialized");

    const cancelledOrder = await sequelize.transaction(async (transaction: Transaction) => {
      const order = await this.findSaleForUpdate(merchantId, orderId, transaction);
      const resolution = getInStoreResolution(order.metadata);

      if (resolution.cancellation) {
        if (
          resolution.cancellation.idempotencyKey === idempotencyKey &&
          resolution.cancellation.idempotencyFingerprint === idempotencyFingerprint
        ) {
          return order;
        }

        if (resolution.cancellation.idempotencyKey === idempotencyKey) {
          throw new HttpException(409, "This Idempotency-Key was already used for a different cancellation");
        }

        throw new HttpException(409, `In-store sale ${orderId} has already been cancelled`);
      }

      if (order.deliveryStatus !== "pending") {
        throw new HttpException(
          409,
          `In-store sale ${orderId} cannot be cancelled because its status is ${order.deliveryStatus}. Use the return endpoint for a completed sale`
        );
      }

      const quantitiesByProductId = new Map<string, number>();
      for (const item of order.items || []) {
        quantitiesByProductId.set(
          item.merchantProductId,
          (quantitiesByProductId.get(item.merchantProductId) || 0) + toNumber(item.quantity)
        );
      }

      const inventoryRestoredQuantity = await this.restoreInventoryForItems(
        merchantId,
        quantitiesByProductId,
        transaction
      );
      const cancelledAt = new Date().toISOString();
      const expectedRefundAmount =
        order.paymentStatus === "paid" ? roundMoney(toNumber(order.totalAmount)) : 0;
      const nextResolution: InStoreSaleResolution = {
        ...resolution,
        status: "cancelled",
        refundStatus: expectedRefundAmount > 0 ? "pending" : "not_required",
        expectedRefundAmount,
        cancellation: {
          idempotencyKey,
          idempotencyFingerprint,
          reason,
          cancelledAt,
          cancelledByMerchantId: merchantId,
          inventoryRestoredQuantity,
          inventoryRestoredAt: cancelledAt,
        },
      };

      await order.update(
        {
          deliveryStatus: "cancelled",
          status: "cancelled",
          metadata: {
            ...(order.metadata || {}),
            inStoreResolution: nextResolution,
          },
        },
        { transaction }
      );

      return order;
    });

    return serializeOrder(cancelledOrder);
  }

  static async returnSale(merchantId: string, orderId: string, input: ReturnInStoreSaleInput) {
    const idempotencyKey = requireActionIdempotencyKey(input.idempotencyKey, "return");
    const items = this.mergeReturnItems(input.items);
    const reason = String(input.reason || "").trim();
    const idempotencyFingerprint = buildActionFingerprint({
      items: [...items].sort((first, second) => first.orderItemId.localeCompare(second.orderItemId)),
      reason,
    });
    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) throw new HttpException(500, "Database not initialized");

    const returnedOrder = await sequelize.transaction(async (transaction: Transaction) => {
      const order = await this.findSaleForUpdate(merchantId, orderId, transaction);
      const resolution = getInStoreResolution(order.metadata);
      const existingReturn = getActionByIdempotencyKey(
        resolution.returns,
        idempotencyKey,
        idempotencyFingerprint,
        "return"
      );
      if (existingReturn) return order;

      if (resolution.status === "cancelled" || order.deliveryStatus === "cancelled") {
        throw new HttpException(409, `In-store sale ${orderId} was cancelled and cannot be returned`);
      }
      if (order.deliveryStatus !== "delivered") {
        throw new HttpException(
          409,
          `In-store sale ${orderId} cannot be returned until it is completed. Current status: ${order.deliveryStatus}`
        );
      }

      const orderItems = new Map((order.items || []).map((item) => [item.id, item]));
      const returnedQuantities = { ...resolution.returnedQuantities };
      const quantitiesByProductId = new Map<string, number>();
      const damagedQuantitiesByProductId = new Map<string, number>();
      const returnedItems: InStoreReturnRecord["items"] = [];
      let refundAmount = 0;

      for (const requestedItem of items) {
        const orderItem = orderItems.get(requestedItem.orderItemId);
        if (!orderItem) {
          throw new HttpException(
            404,
            `Returned item ${requestedItem.orderItemId} does not belong to in-store sale ${orderId}`
          );
        }

        const alreadyReturned = toNumber(returnedQuantities[orderItem.id]);
        const originalQuantity = toNumber(orderItem.quantity);
        const remainingQuantity = originalQuantity - alreadyReturned;
        if (requestedItem.quantity > remainingQuantity) {
          throw new HttpException(
            409,
            `Cannot return ${requestedItem.quantity} unit(s) of ${orderItem.productNameSnapshot}; only ${Math.max(
              0,
              remainingQuantity
            )} unit(s) remain eligible for return`
          );
        }

        returnedQuantities[orderItem.id] = alreadyReturned + requestedItem.quantity;
        const itemRefundAmount =
          order.paymentStatus === "paid"
            ? requestedItem.quantity === originalQuantity
              ? roundMoney(toNumber(orderItem.lineTotal))
              : roundMoney((toNumber(orderItem.lineTotal) / originalQuantity) * requestedItem.quantity)
            : 0;
        refundAmount = roundMoney(refundAmount + itemRefundAmount);

        if (requestedItem.condition === "resalable") {
          quantitiesByProductId.set(
            orderItem.merchantProductId,
            (quantitiesByProductId.get(orderItem.merchantProductId) || 0) + requestedItem.quantity
          );
        } else {
          damagedQuantitiesByProductId.set(
            orderItem.merchantProductId,
            (damagedQuantitiesByProductId.get(orderItem.merchantProductId) || 0) + requestedItem.quantity
          );
        }

        returnedItems.push({
          orderItemId: orderItem.id,
          productId: orderItem.merchantProductId,
          productName: orderItem.productNameSnapshot,
          quantity: requestedItem.quantity,
          condition: requestedItem.condition,
          refundAmount: itemRefundAmount,
          inventoryRestored: requestedItem.condition === "resalable",
        });
      }

      const inventoryRestoredQuantity = await this.restoreInventoryForItems(
        merchantId,
        quantitiesByProductId,
        transaction
      );
      await this.reversePurchaseCountForItems(merchantId, damagedQuantitiesByProductId, transaction);
      const returnedAt = new Date().toISOString();
      const totalOrderedQuantity = (order.items || []).reduce(
        (sum, item) => sum + toNumber(item.quantity),
        0
      );
      const totalReturnedQuantity = Object.values(returnedQuantities).reduce(
        (sum, quantity) => sum + toNumber(quantity),
        0
      );
      const nextExpectedRefundAmount = roundMoney(
        resolution.expectedRefundAmount + refundAmount
      );
      const nextRefundStatus: RefundStatus =
        nextExpectedRefundAmount <= resolution.refundedAmount
          ? "completed"
          : nextExpectedRefundAmount > 0
            ? "pending"
            : "not_required";
      const nextResolution: InStoreSaleResolution = {
        ...resolution,
        status: totalReturnedQuantity >= totalOrderedQuantity ? "returned" : "partially_returned",
        refundStatus: nextRefundStatus,
        expectedRefundAmount: nextExpectedRefundAmount,
        returnedQuantities,
        returns: [
          ...resolution.returns,
          {
            returnId: randomUUID(),
            idempotencyKey,
            idempotencyFingerprint,
            reason,
            items: returnedItems,
            refundAmount,
            inventoryRestoredQuantity,
            returnedAt,
            returnedByMerchantId: merchantId,
          },
        ],
      };

      await order.update(
        {
          metadata: {
            ...(order.metadata || {}),
            inStoreResolution: nextResolution,
          },
        },
        { transaction }
      );

      return order;
    });

    return serializeOrder(returnedOrder);
  }

  static async refundSale(merchantId: string, orderId: string, input: RefundInStoreSaleInput) {
    const idempotencyKey = requireActionIdempotencyKey(input.idempotencyKey, "refund");
    const method = input.method;
    const reference = normalizeText(input.reference);
    const note = normalizeText(input.note);
    const requestedAmount = input.amount === undefined ? null : roundMoney(Number(input.amount));
    const idempotencyFingerprint = buildActionFingerprint({
      amount: requestedAmount,
      method,
      reference,
      note,
    });
    if (method !== "cash" && !reference) {
      throw new HttpException(
        400,
        `A reference is required when recording a ${method} refund`
      );
    }

    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) throw new HttpException(500, "Database not initialized");

    const refundedOrder = await sequelize.transaction(async (transaction: Transaction) => {
      const order = await this.findSaleForUpdate(merchantId, orderId, transaction);
      const resolution = getInStoreResolution(order.metadata);
      const existingRefund = getActionByIdempotencyKey(
        resolution.refunds,
        idempotencyKey,
        idempotencyFingerprint,
        "refund"
      );
      if (existingRefund) return order;

      if (order.paymentStatus !== "paid") {
        throw new HttpException(
          409,
          `Sale ${orderId} cannot be refunded because its payment status is ${order.paymentStatus}; no successful payment was recorded`
        );
      }

      const refundableAmount = roundMoney(
        Math.max(0, resolution.expectedRefundAmount - resolution.refundedAmount)
      );
      if (refundableAmount <= 0) {
        throw new HttpException(
          409,
          `Sale ${orderId} has no refundable balance. Cancel the sale or record a return before issuing a refund`
        );
      }

      const amount = requestedAmount === null ? refundableAmount : requestedAmount;
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new HttpException(400, "Refund amount must be greater than zero");
      }
      if (amount > refundableAmount) {
        throw new HttpException(
          409,
          `Refund amount ${amount.toFixed(2)} exceeds the remaining refundable balance of ${refundableAmount.toFixed(
            2
          )}`
        );
      }

      const refundedAt = new Date().toISOString();
      const nextRefundedAmount = roundMoney(resolution.refundedAmount + amount);
      const nextResolution: InStoreSaleResolution = {
        ...resolution,
        refundedAmount: nextRefundedAmount,
        refundStatus:
          nextRefundedAmount >= resolution.expectedRefundAmount
            ? "completed"
            : "partially_refunded",
        refunds: [
          ...resolution.refunds,
          {
            refundId: randomUUID(),
            idempotencyKey,
            idempotencyFingerprint,
            amount,
            method,
            reference,
            note,
            refundedAt,
            refundedByMerchantId: merchantId,
          },
        ],
      };

      await order.update(
        {
          metadata: {
            ...(order.metadata || {}),
            inStoreResolution: nextResolution,
          },
        },
        { transaction }
      );

      return order;
    });

    return serializeOrder(refundedOrder);
  }

  static async listSales(input: ListInStoreSalesInput) {
    const page = parseBoundedInteger(input.page, "page", 1, MAX_SALES_PAGE);
    const limit = parseBoundedInteger(input.limit, "limit", 20, MAX_SALES_LIMIT);
    const offset = (page - 1) * limit;
    const [sortColumn, sortDirection] = resolveSort(input.sortBy, input.sortDirection);

    const { rows, count } = await DrugstoreOrder.findAndCountAll({
      where: buildListWhere(input),
      include: [{ model: DrugstoreOrderItem, as: "items" }],
      distinct: true,
      order: [[sortColumn, sortDirection], ["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      items: rows.map(serializeOrder),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getSaleById(merchantId: string, orderId: string) {
    const order = await DrugstoreOrder.findOne({
      // The list returns both the database UUID and the human-facing IS-... ID;
      // accept either when the detail modal opens.
      where: this.buildSaleLookup(merchantId, orderId),
      include: [{ model: DrugstoreOrderItem, as: "items" }],
    });

    return order ? serializeOrder(order) : null;
  }

  static async exportSalesCsv(input: Omit<ListInStoreSalesInput, "page" | "limit">) {
    const [sortColumn, sortDirection] = resolveSort(input.sortBy, input.sortDirection);
    const where = buildListWhere(input);

    const headers = [
      "orderId",
      "customerName",
      "date",
      "time",
      "itemQty",
      "paymentStatus",
      "deliveryStatus",
      "totalAmount",
      "currency",
    ];

    const lines = [headers.join(",")];
    let offset = 0;

    while (true) {
      const rows = await DrugstoreOrder.findAll({
        where,
        include: [{ model: DrugstoreOrderItem, as: "items" }],
        order: [[sortColumn, sortDirection], ["createdAt", "DESC"]],
        limit: EXPORT_BATCH_SIZE,
        offset,
      });

      if (rows.length === 0) break;

      lines.push(
        ...rows.map((row) => {
          const sale = serializeOrder(row);
          return [
            sale.orderId,
            sale.customerName,
            sale.date,
            sale.time,
            sale.itemQty,
            sale.paymentStatusLabel,
            sale.deliveryStatusLabel,
            sale.totalAmount,
            sale.currency,
          ]
            .map(csvEscape)
            .join(",");
        })
      );

      offset += rows.length;
      if (rows.length < EXPORT_BATCH_SIZE) break;
    }

    return lines.join("\n");
  }
}
