import { HttpException } from "@medtech/utils";
import { randomUUID } from "crypto";
import { Op, Transaction } from "sequelize";
import { DrugstoreOrder } from "./DrugstoreOrder.model";
import { DrugstoreOrderItem } from "./DrugstoreOrderItem.model";
import { Product } from "../products/Product.model";
import { applicationConfig } from "../../config";
import { ExperienceOneInternalClient } from "../drugstore_internal/ExperienceOneInternalClient";
import { ProductStatus } from "../../constants/enums";

type PaymentStatus = "pending" | "paid" | "failed";
type DeliveryStatus = "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled";
type DateRange = "today" | "yesterday" | "last_7_days" | "last_30_days";
type AgeBucket = "lt_24h" | "between_24h_48h" | "gt_48h";
type AnalyticsRange = "12_months" | "3_months" | "30_days" | "7_days" | "24_hours";
type TopSellingPeriod = "this_week" | "last_7_days" | "last_30_days" | "all_time";
type RangeWindowKind = AnalyticsRange | "custom";
type TimeBucketGranularity = "hour" | "day" | "month";
type LegacyOrderStatus = "new" | "processing" | "ready" | "delivered" | "cancelled";

type AnalyticsOrderRow = {
  placedAt: Date | string;
  paymentStatus: PaymentStatus;
  totalAmount: string | number;
  sourceUserId: number | string;
  deliveryStatus: DeliveryStatus;
};

type AnalyticsBucket = {
  key: string;
  label: string;
  salesAmount: number;
  orderCount: number;
  uniqueUsers: number;
};

type RangeWindow = {
  range: RangeWindowKind;
  isCustom: boolean;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  bucketCount: number;
  bucketGranularity: TimeBucketGranularity;
};

type DateFilterInput = {
  range?: string;
  startDate?: string;
  endDate?: string;
};

type TopSellingInput = DateFilterInput & {
  period?: string;
};

type ListOrderInput = DateFilterInput & {
  merchantId: string;
  page?: number;
  limit?: number;
  status?: string[] | string;
  paymentStatus?: string[] | string;
  deliveryStatus?: string[] | string;
  dateRange?: string;
  ageBucket?: string;
  search?: string;
};

const normalizeArray = (value?: string[] | string): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return [value];
};

const toCanonicalValue = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeCanonicalArray = (value?: string[] | string): string[] | undefined => {
  const values = normalizeArray(value);
  if (!values || values.length === 0) return undefined;
  const normalized = values.map(toCanonicalValue).filter(Boolean);
  if (normalized.length === 0) return undefined;
  return [...new Set(normalized)];
};

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  pending: "pending",
  paid: "paid",
  failed: "failed",
};

const DELIVERY_STATUS_MAP: Record<string, DeliveryStatus> = {
  pending: "pending",
  picked_up: "picked_up",
  pickedup: "picked_up",
  in_transit: "in_transit",
  intransit: "in_transit",
  delivered: "delivered",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const DATE_RANGE_MAP: Record<string, DateRange> = {
  today: "today",
  yesterday: "yesterday",
  last_7_days: "last_7_days",
  last_30_days: "last_30_days",
  last_7_day: "last_7_days",
  last_30_day: "last_30_days",
};

const AGE_BUCKET_MAP: Record<string, AgeBucket> = {
  lt_24h: "lt_24h",
  less_than_24_hours: "lt_24h",
  less_than_24_hour: "lt_24h",
  between_24h_48h: "between_24h_48h",
  "24_48_hours": "between_24h_48h",
  over_48_hours: "gt_48h",
  gt_48h: "gt_48h",
};

const ANALYTICS_RANGE_MAP: Record<string, AnalyticsRange> = {
  "12_months": "12_months",
  "12months": "12_months",
  "12_month": "12_months",
  "3_months": "3_months",
  "3months": "3_months",
  "3_month": "3_months",
  "30_days": "30_days",
  "30days": "30_days",
  "30_day": "30_days",
  "7_days": "7_days",
  "7days": "7_days",
  "7_day": "7_days",
  "24_hours": "24_hours",
  "24hours": "24_hours",
  "24_hour": "24_hours",
};

const TOP_SELLING_PERIOD_MAP: Record<string, TopSellingPeriod> = {
  this_week: "this_week",
  thisweek: "this_week",
  last_7_days: "last_7_days",
  last_7_day: "last_7_days",
  last7days: "last_7_days",
  last_30_days: "last_30_days",
  last_30_day: "last_30_days",
  last30days: "last_30_days",
  all_time: "all_time",
  alltime: "all_time",
};

const MERCHANT_MANUAL_SEED_SOURCE = "merchant_manual_seed";
const MERCHANT_MANUAL_SEED_VERSION = 1;
const ALLOWED_MANUAL_SEED_ENVS = new Set(["development", "staging"]);

const LEGACY_STATUS_VALUES = new Set(["new", "processing", "ready", "delivered", "cancelled"]);
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const APP_TIMEZONE = applicationConfig.timezone || "Africa/Lagos";

const mapValuesFromDict = <T extends string>(
  values: string[] | undefined,
  map: Record<string, T>
): T[] | undefined => {
  if (!values || values.length === 0) return undefined;
  const mapped = values
    .map((value) => map[value])
    .filter((value): value is T => Boolean(value));
  if (mapped.length === 0) return undefined;
  return [...new Set(mapped)];
};

const resolveDateRange = (value?: string): DateRange | undefined => {
  if (!value) return undefined;
  return DATE_RANGE_MAP[toCanonicalValue(value)];
};

const resolveAgeBucket = (value?: string): AgeBucket | undefined => {
  if (!value) return undefined;
  return AGE_BUCKET_MAP[toCanonicalValue(value)];
};

const resolveAnalyticsRange = (value?: string): AnalyticsRange => {
  if (!value) return "12_months";
  return ANALYTICS_RANGE_MAP[toCanonicalValue(value)] || "12_months";
};

const resolveTopSellingPeriod = (value?: string): TopSellingPeriod => {
  if (!value) return "this_week";
  return TOP_SELLING_PERIOD_MAP[toCanonicalValue(value)] || "this_week";
};

const parseDateOnlyParts = (value: string): { year: number; month: number; day: number } | null => {
  const match = DATE_ONLY_PATTERN.exec(String(value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  const utcTimestamp = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return utcTimestamp - date.getTime();
};

const zonedDateTimeToUtc = (
  dateParts: { year: number; month: number; day: number },
  timeParts: { hour: number; minute: number; second: number; millisecond: number },
  timeZone: string
): Date => {
  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
    timeParts.millisecond
  );

  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let adjustedTimestamp = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(adjustedTimestamp), timeZone);
  if (secondOffset !== firstOffset) {
    adjustedTimestamp = utcGuess - secondOffset;
  }

  return new Date(adjustedTimestamp);
};

const parseBoundaryDate = (value: string, boundary: "start" | "end"): Date => {
  const dateParts = parseDateOnlyParts(value);
  if (!dateParts) {
    throw new HttpException(400, "startDate and endDate must use YYYY-MM-DD format");
  }

  return zonedDateTimeToUtc(
    dateParts,
    boundary === "start"
      ? { hour: 0, minute: 0, second: 0, millisecond: 0 }
      : { hour: 23, minute: 59, second: 59, millisecond: 999 },
    APP_TIMEZONE
  );
};

const resolveExplicitDateRange = (
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } | undefined => {
  const normalizedStartDate = String(startDate || "").trim();
  const normalizedEndDate = String(endDate || "").trim();
  const hasStartDate = Boolean(normalizedStartDate);
  const hasEndDate = Boolean(normalizedEndDate);

  if (hasStartDate !== hasEndDate) {
    throw new HttpException(400, "startDate and endDate must both be provided");
  }

  if (!hasStartDate) return undefined;

  const start = parseBoundaryDate(normalizedStartDate, "start");
  const end = parseBoundaryDate(normalizedEndDate, "end");

  if (start.getTime() > end.getTime()) {
    throw new HttpException(400, "startDate cannot be after endDate");
  }

  return { start, end };
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value: unknown): Date => {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }
  return parsed;
};

const roundMoney = (value: number): number => Number(value.toFixed(2));
const roundPercentage = (value: number): number => Number(value.toFixed(1));

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return roundPercentage(((current - previous) / previous) * 100);
};

const startOfHour = (value: Date): Date => {
  const result = new Date(value);
  result.setMinutes(0, 0, 0);
  return result;
};

const startOfDay = (value: Date): Date => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfMonth = (value: Date): Date => {
  const result = new Date(value);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfWeek = (value: Date): Date => {
  const result = startOfDay(value);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

const addDays = (value: Date, amount: number): Date => {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
};

const addHours = (value: Date, amount: number): Date => {
  const result = new Date(value);
  result.setHours(result.getHours() + amount);
  return result;
};

const addMonths = (value: Date, amount: number): Date => {
  const result = new Date(value);
  result.setMonth(result.getMonth() + amount);
  return result;
};

const formatBucketKey = (date: Date, granularity: TimeBucketGranularity): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");

  if (granularity === "month") return `${year}-${month}`;
  if (granularity === "day") return `${year}-${month}-${day}`;
  return `${year}-${month}-${day}T${hour}`;
};

const formatBucketLabel = (date: Date, granularity: TimeBucketGranularity): string => {
  if (granularity === "month") {
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  }
  if (granularity === "day") {
    return date.toLocaleString("en-US", { day: "2-digit", month: "short" });
  }
  return date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const buildPresetRangeWindow = (range: AnalyticsRange): RangeWindow => {
  const now = new Date();

  if (range === "12_months") {
    const start = addMonths(startOfMonth(now), -11);
    const previousStart = addMonths(start, -12);
    const previousEnd = new Date(start.getTime() - 1);
    return {
      range,
      isCustom: false,
      start,
      end: now,
      previousStart,
      previousEnd,
      bucketCount: 12,
      bucketGranularity: "month",
    };
  }

  if (range === "3_months") {
    const start = addMonths(startOfMonth(now), -2);
    const previousStart = addMonths(start, -3);
    const previousEnd = new Date(start.getTime() - 1);
    return {
      range,
      isCustom: false,
      start,
      end: now,
      previousStart,
      previousEnd,
      bucketCount: 3,
      bucketGranularity: "month",
    };
  }

  if (range === "30_days") {
    const start = startOfDay(addDays(now, -29));
    const previousStart = addDays(start, -30);
    const previousEnd = new Date(start.getTime() - 1);
    return {
      range,
      isCustom: false,
      start,
      end: now,
      previousStart,
      previousEnd,
      bucketCount: 30,
      bucketGranularity: "day",
    };
  }

  if (range === "7_days") {
    const start = startOfDay(addDays(now, -6));
    const previousStart = addDays(start, -7);
    const previousEnd = new Date(start.getTime() - 1);
    return {
      range,
      isCustom: false,
      start,
      end: now,
      previousStart,
      previousEnd,
      bucketCount: 7,
      bucketGranularity: "day",
    };
  }

  const start = startOfHour(addHours(now, -23));
  const previousStart = addHours(start, -24);
  const previousEnd = new Date(start.getTime() - 1);
  return {
    range,
    isCustom: false,
    start,
    end: now,
    previousStart,
    previousEnd,
    bucketCount: 24,
    bucketGranularity: "hour",
  };
};

const inferCustomBucketSettings = (
  start: Date,
  end: Date
): { bucketCount: number; bucketGranularity: TimeBucketGranularity } => {
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const durationMs = Math.max(hourMs, end.getTime() - start.getTime() + 1);

  if (durationMs <= dayMs) {
    return {
      bucketCount: Math.max(1, Math.ceil(durationMs / hourMs)),
      bucketGranularity: "hour",
    };
  }

  if (durationMs <= 31 * dayMs) {
    return {
      bucketCount: Math.max(1, Math.ceil(durationMs / dayMs)),
      bucketGranularity: "day",
    };
  }

  const startMonthIndex = start.getFullYear() * 12 + start.getMonth();
  const endMonthIndex = end.getFullYear() * 12 + end.getMonth();

  return {
    bucketCount: Math.max(1, endMonthIndex - startMonthIndex + 1),
    bucketGranularity: "month",
  };
};

const buildCustomRangeWindow = (start: Date, end: Date): RangeWindow => {
  const durationMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs + 1);
  const { bucketCount, bucketGranularity } = inferCustomBucketSettings(start, end);

  return {
    range: "custom",
    isCustom: true,
    start,
    end,
    previousStart,
    previousEnd,
    bucketCount,
    bucketGranularity,
  };
};

const resolveAnalyticsWindow = (filters: DateFilterInput = {}): RangeWindow => {
  const explicitRange = resolveExplicitDateRange(filters.startDate, filters.endDate);
  if (explicitRange) {
    return buildCustomRangeWindow(explicitRange.start, explicitRange.end);
  }

  return buildPresetRangeWindow(resolveAnalyticsRange(filters.range));
};

const buildSeriesBuckets = (window: RangeWindow): Array<{ key: string; label: string; date: Date }> => {
  const buckets: Array<{ key: string; label: string; date: Date }> = [];
  for (let index = 0; index < window.bucketCount; index += 1) {
    let bucketDate: Date;

    if (window.bucketGranularity === "month") {
      bucketDate = addMonths(window.start, index);
    } else if (window.bucketGranularity === "day") {
      bucketDate = addDays(window.start, index);
    } else {
      bucketDate = addHours(window.start, index);
    }

    buckets.push({
      key: formatBucketKey(bucketDate, window.bucketGranularity),
      label: formatBucketLabel(bucketDate, window.bucketGranularity),
      date: bucketDate,
    });
  }

  return buckets;
};

const getTopSellingWindow = (
  period: TopSellingPeriod
): { period: TopSellingPeriod; start?: Date; end?: Date } => {
  const now = new Date();

  if (period === "this_week") {
    return { period, start: startOfWeek(now), end: now };
  }

  if (period === "last_7_days") {
    return { period, start: startOfDay(addDays(now, -6)), end: now };
  }

  if (period === "last_30_days") {
    return { period, start: startOfDay(addDays(now, -29)), end: now };
  }

  return { period };
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

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

const resolveOrderFilterWindow = (input: Pick<ListOrderInput, "range" | "startDate" | "endDate" | "dateRange">) => {
  const explicitRange = resolveExplicitDateRange(input.startDate, input.endDate);
  if (explicitRange) {
    return explicitRange;
  }

  if (input.range) {
    const analyticsWindow = buildPresetRangeWindow(resolveAnalyticsRange(input.range));
    return {
      start: analyticsWindow.start,
      end: analyticsWindow.end,
    };
  }

  return getDateRange(resolveDateRange(input.dateRange));
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

const toIsoString = (value: unknown): string => {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const csvEscape = (value: unknown): string => {
  const asText = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(asText)) {
    return `"${asText.replace(/"/g, '""')}"`;
  }
  return asText;
};

const buildWhereClause = (input: ListOrderInput): any => {
  const where: any = { merchantId: input.merchantId };
  const andClauses: any[] = [];

  const paymentStatuses = mapValuesFromDict(normalizeCanonicalArray(input.paymentStatus), PAYMENT_STATUS_MAP);
  if (paymentStatuses && paymentStatuses.length > 0) {
    andClauses.push({ paymentStatus: { [Op.in]: paymentStatuses } });
  }

  const deliveryStatuses = mapValuesFromDict(normalizeCanonicalArray(input.deliveryStatus), DELIVERY_STATUS_MAP);
  if (deliveryStatuses && deliveryStatuses.length > 0) {
    andClauses.push({ deliveryStatus: { [Op.in]: deliveryStatuses } });
  }

  const legacyStatuses = normalizeCanonicalArray(input.status)?.filter((value) => LEGACY_STATUS_VALUES.has(value));
  if (legacyStatuses && legacyStatuses.length > 0) {
    andClauses.push({ status: { [Op.in]: legacyStatuses } });
  }

  const orderFilterWindow = resolveOrderFilterWindow(input);
  if (orderFilterWindow.start && orderFilterWindow.end) {
    andClauses.push({ placedAt: { [Op.between]: [orderFilterWindow.start, orderFilterWindow.end] } });
  }

  const ageBucketWhere = getAgeBucketWhere(resolveAgeBucket(input.ageBucket));
  if (Object.keys(ageBucketWhere).length > 0) {
    andClauses.push(ageBucketWhere);
  }

  const normalizedSearch = String(input.search || "").trim();
  if (normalizedSearch) {
    const searchQuery: any[] = [
      { paymentReference: { [Op.iLike]: `%${normalizedSearch}%` } },
      { recipientName: { [Op.iLike]: `%${normalizedSearch}%` } },
      { recipientPhone: { [Op.iLike]: `%${normalizedSearch}%` } },
    ];

    if (isUuid(normalizedSearch)) {
      searchQuery.push({ sourceOrderId: normalizedSearch });
      searchQuery.push({ id: normalizedSearch });
    }

    andClauses.push({ [Op.or]: searchQuery });
  }

  if (andClauses.length > 0) {
    where[Op.and] = andClauses;
  }

  return where;
};

const buildRangeWhere = (merchantId: string, start: Date, end: Date) => ({
  merchantId,
  placedAt: {
    [Op.between]: [start, end],
  },
});

const fetchAnalyticsOrders = async (merchantId: string, start: Date, end: Date): Promise<AnalyticsOrderRow[]> => {
  const rows = await DrugstoreOrder.findAll({
    where: buildRangeWhere(merchantId, start, end),
    attributes: ["placedAt", "paymentStatus", "totalAmount", "sourceUserId", "deliveryStatus"],
    raw: true,
  });

  return rows as AnalyticsOrderRow[];
};

const buildFilterSummary = (window: RangeWindow) => ({
  range: window.isCustom ? null : window.range,
  isCustom: window.isCustom,
  startAt: window.start.toISOString(),
  endAt: window.end.toISOString(),
  previousStartAt: window.previousStart.toISOString(),
  previousEndAt: window.previousEnd.toISOString(),
});

const resolveLegacyStatusFromDeliveryStatus = (deliveryStatus: DeliveryStatus): LegacyOrderStatus => {
  if (deliveryStatus === "delivered") return "delivered";
  if (deliveryStatus === "cancelled") return "cancelled";
  if (deliveryStatus === "picked_up" || deliveryStatus === "in_transit") return "ready";
  if (deliveryStatus === "pending") return "processing";
  return "new";
};

const createSeedDate = (daysAgo: number, hour: number, minute = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const addDaysToDate = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const buildSeedProducts = async (merchantId: string, transaction: Transaction): Promise<Product[]> => {
  const sampleProducts = [
    {
      merchantId,
      name: "Paracetamol 500mg Tablets",
      description: "Pain relief tablet pack for quick merchant order demos.",
      category: "Pain Relief",
      brand: "Emzor",
      sku: `SEED-PARA-${merchantId.slice(0, 8)}`,
      price: 2500,
      vat: 187.5,
      discountPercentage: 0,
      minQuantity: 1,
      maxQuantity: 10,
      inventory: 40,
      status: ProductStatus.IN_STOCK,
      images: [
        {
          url: "https://example.com/products/seed-paracetamol.png",
          order: 1,
          isMain: true,
        },
      ],
      isActive: true,
      requiresPrescription: false,
    },
    {
      merchantId,
      name: "Amoxicillin 500mg Capsules",
      description: "Prescription antibiotic sample product for seeded drugstore orders.",
      category: "Antibiotics",
      brand: "M&G",
      sku: `SEED-AMOX-${merchantId.slice(0, 8)}`,
      price: 7200,
      vat: 540,
      discountPercentage: 5,
      minQuantity: 1,
      maxQuantity: 5,
      inventory: 18,
      status: ProductStatus.IN_STOCK,
      images: [
        {
          url: "https://example.com/products/seed-amoxicillin.png",
          order: 1,
          isMain: true,
        },
      ],
      isActive: true,
      requiresPrescription: true,
    },
    {
      merchantId,
      name: "Vitamin C 1000mg",
      description: "Supplement sample product used for seeded merchant order rows.",
      category: "Vitamins & Nutrition",
      brand: "Nature Made",
      sku: `SEED-VITC-${merchantId.slice(0, 8)}`,
      price: 4800,
      vat: 360,
      discountPercentage: 10,
      minQuantity: 1,
      maxQuantity: 8,
      inventory: 12,
      status: ProductStatus.LOW_STOCK,
      images: [
        {
          url: "https://example.com/products/seed-vitamin-c.png",
          order: 1,
          isMain: true,
        },
      ],
      isActive: true,
      requiresPrescription: false,
    },
  ];

  return Product.bulkCreate(sampleProducts as any, {
    transaction,
    returning: true,
  });
};

export class DrugstoreOrderService {
  static async seedMerchantOrders(merchantId: string) {
    const nodeEnv = String(applicationConfig.nodeEnv || "development").trim().toLowerCase();
    if (!ALLOWED_MANUAL_SEED_ENVS.has(nodeEnv)) {
      throw new HttpException(403, "Drugstore order seed is only available in development and staging");
    }

    const existingSeed = await DrugstoreOrder.findOne({
      where: {
        merchantId,
        metadata: {
          [Op.contains]: {
            seedSource: MERCHANT_MANUAL_SEED_SOURCE,
            seedVersion: MERCHANT_MANUAL_SEED_VERSION,
          },
        },
      } as any,
    });

    if (existingSeed) {
      throw new HttpException(409, "Sample merchant orders have already been seeded for this account");
    }

    const sequelize = DrugstoreOrder.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    return sequelize.transaction(async (transaction) => {
      let products = await Product.findAll({
        where: {
          merchantId,
          isActive: true,
        },
        order: [["createdAt", "ASC"]],
        limit: 3,
        transaction,
      });

      let productsCreated = 0;
      if (products.length === 0) {
        products = await buildSeedProducts(merchantId, transaction);
        productsCreated = products.length;
      }

      const primaryProduct = products[0];
      const secondaryProduct = products[1] || primaryProduct;
      const tertiaryProduct = products[2] || secondaryProduct || primaryProduct;

      const orderBlueprints = [
        {
          recipientName: "Tamara Ike",
          recipientPhone: "08055713517",
          sourceUserId: 4101,
          sourceUserRole: "consumer" as const,
          paymentStatus: "paid" as PaymentStatus,
          deliveryStatus: "pending" as DeliveryStatus,
          placedAt: createSeedDate(0, 9, 15),
          deliveryFee: 700,
          deliveryTimeSlot: "09:00AM - 10:00AM",
          note: "Awaiting pharmacist confirmation.",
          items: [
            { product: primaryProduct, quantity: 1 },
            { product: secondaryProduct, quantity: 1 },
          ],
        },
        {
          recipientName: "Kunle Bamidele",
          recipientPhone: "08030001122",
          sourceUserId: 4102,
          sourceUserRole: "consumer" as const,
          paymentStatus: "pending" as PaymentStatus,
          deliveryStatus: "pending" as DeliveryStatus,
          placedAt: createSeedDate(0, 14, 5),
          deliveryFee: 900,
          deliveryTimeSlot: "02:00PM - 04:00PM",
          note: "Payment is still pending confirmation.",
          items: [{ product: tertiaryProduct, quantity: 2 }],
        },
        {
          recipientName: "Chiamaka Udeh",
          recipientPhone: "08120006789",
          sourceUserId: 4103,
          sourceUserRole: "doctor" as const,
          paymentStatus: "paid" as PaymentStatus,
          deliveryStatus: "picked_up" as DeliveryStatus,
          placedAt: createSeedDate(1, 11, 20),
          deliveryFee: 600,
          deliveryTimeSlot: "11:00AM - 01:00PM",
          note: "Rider picked up from the pharmacy.",
          items: [{ product: secondaryProduct, quantity: 1 }],
        },
        {
          recipientName: "Femi Akinola",
          recipientPhone: "07045556677",
          sourceUserId: 4104,
          sourceUserRole: "consumer" as const,
          paymentStatus: "paid" as PaymentStatus,
          deliveryStatus: "in_transit" as DeliveryStatus,
          placedAt: createSeedDate(3, 16, 40),
          deliveryFee: 750,
          deliveryTimeSlot: "04:00PM - 06:00PM",
          note: "Dispatch rider is on the way.",
          items: [
            { product: primaryProduct, quantity: 2 },
            { product: tertiaryProduct, quantity: 1 },
          ],
        },
        {
          recipientName: "Aisha Lawal",
          recipientPhone: "08094445566",
          sourceUserId: 4105,
          sourceUserRole: "consumer" as const,
          paymentStatus: "failed" as PaymentStatus,
          deliveryStatus: "cancelled" as DeliveryStatus,
          placedAt: createSeedDate(6, 10, 10),
          deliveryFee: 500,
          deliveryTimeSlot: "10:00AM - 12:00PM",
          note: "Payment failure cancelled the order.",
          items: [{ product: primaryProduct, quantity: 1 }],
        },
        {
          recipientName: "Bola Ojo",
          recipientPhone: "09051234567",
          sourceUserId: 4106,
          sourceUserRole: "doctor" as const,
          paymentStatus: "paid" as PaymentStatus,
          deliveryStatus: "delivered" as DeliveryStatus,
          placedAt: createSeedDate(14, 13, 30),
          deliveryFee: 800,
          deliveryTimeSlot: "01:00PM - 03:00PM",
          note: "Delivered successfully within the last 30 days.",
          items: [
            { product: secondaryProduct, quantity: 1 },
            { product: tertiaryProduct, quantity: 1 },
          ],
        },
        {
          recipientName: "Ngozi Eze",
          recipientPhone: "08135558899",
          sourceUserId: 4107,
          sourceUserRole: "consumer" as const,
          paymentStatus: "paid" as PaymentStatus,
          deliveryStatus: "delivered" as DeliveryStatus,
          placedAt: createSeedDate(35, 8, 45),
          deliveryFee: 650,
          deliveryTimeSlot: "08:00AM - 10:00AM",
          note: "Delivered outside the 30-day window for custom date filter checks.",
          items: [{ product: tertiaryProduct, quantity: 3 }],
        },
      ];

      const sampleOrderIds: string[] = [];

      for (const [index, blueprint] of orderBlueprints.entries()) {
        const builtItems = blueprint.items.map(({ product, quantity }) => {
          const unitPriceSnapshot = roundMoney(toNumber(product.price));
          const vatSnapshot = roundMoney(toNumber(product.vat));
          const discountPercentageSnapshot = roundMoney(toNumber(product.discountPercentage));
          const lineSubtotal = roundMoney(unitPriceSnapshot * quantity);
          const lineVatTotal = roundMoney(vatSnapshot * quantity);
          const lineDiscountTotal = roundMoney((lineSubtotal * discountPercentageSnapshot) / 100);
          const lineTotal = roundMoney(lineSubtotal + lineVatTotal - lineDiscountTotal);

          return {
            merchantProductId: product.id,
            skuSnapshot: product.sku || null,
            productNameSnapshot: product.name,
            descriptionSnapshot: product.description || null,
            brandSnapshot: product.brand || null,
            categorySnapshot: product.category || null,
            imageUrlSnapshot: product.mainImage || null,
            unitPriceSnapshot,
            vatSnapshot,
            discountPercentageSnapshot,
            requiresPrescriptionSnapshot: Boolean(product.requiresPrescription),
            quantity,
            lineSubtotal,
            lineVatTotal,
            lineDiscountTotal,
            lineTotal,
          };
        });

        const subtotal = roundMoney(builtItems.reduce((sum, item) => sum + item.lineSubtotal, 0));
        const vatTotal = roundMoney(builtItems.reduce((sum, item) => sum + item.lineVatTotal, 0));
        const discountTotal = roundMoney(
          builtItems.reduce((sum, item) => sum + item.lineDiscountTotal, 0)
        );
        const totalAmount = roundMoney(subtotal + vatTotal - discountTotal + blueprint.deliveryFee);
        const paymentVerifiedAt =
          blueprint.paymentStatus === "paid"
            ? new Date(blueprint.placedAt.getTime() + 30 * 60 * 1000)
            : blueprint.placedAt;
        const sourceOrderId = randomUUID();
        const sourceSyncKey = `merchant-seed-${merchantId}-${index + 1}-${randomUUID()}`;
        const paymentReference = `seed-pay-${merchantId.slice(0, 8)}-${index + 1}-${Date.now()}`;
        const deliveryDate = toDateOnly(addDaysToDate(blueprint.placedAt, 1));

        const order = await DrugstoreOrder.create(
          {
            merchantId,
            sourceOrderId,
            sourceSyncKey,
            paymentReference,
            sourceUserId: blueprint.sourceUserId,
            sourceUserRole: blueprint.sourceUserRole,
            paymentVerifiedAt,
            paymentStatus: blueprint.paymentStatus,
            deliveryStatus: blueprint.deliveryStatus,
            placedAt: blueprint.placedAt,
            subtotal,
            vatTotal,
            discountTotal,
            deliveryFee: blueprint.deliveryFee,
            totalAmount,
            currency: "NGN",
            discountCode: null,
            discountId: null,
            recipientName: blueprint.recipientName,
            recipientPhone: blueprint.recipientPhone,
            addressLine1: `${index + 6} Solaru Street`,
            addressLine2: "Soluyi, Gbagada",
            city: "Lagos",
            state: "Lagos",
            landmark: "Near the junction",
            deliveryNote: blueprint.note,
            deliveryDate,
            deliveryTimeSlot: blueprint.deliveryTimeSlot,
            status: resolveLegacyStatusFromDeliveryStatus(blueprint.deliveryStatus),
            metadata: {
              seedSource: MERCHANT_MANUAL_SEED_SOURCE,
              seedVersion: MERCHANT_MANUAL_SEED_VERSION,
              seedLabel: `sample-order-${index + 1}`,
              seededAt: new Date().toISOString(),
              seededByMerchantId: merchantId,
              placedAt: blueprint.placedAt.toISOString(),
            },
            createdAt: blueprint.placedAt,
            updatedAt: blueprint.placedAt,
          },
          { transaction }
        );

        await DrugstoreOrderItem.bulkCreate(
          builtItems.map((item) => ({
            orderId: order.id,
            ...item,
          })) as any,
          { transaction }
        );

        sampleOrderIds.push(order.id);
      }

      return {
        merchantId,
        seeded: true,
        productsCreated,
        ordersCreated: sampleOrderIds.length,
        sampleOrderIds,
      };
    });
  }

  static async listOrders(input: ListOrderInput) {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const offset = (page - 1) * limit;

    const where = buildWhereClause(input);

    const { rows, count } = await DrugstoreOrder.findAndCountAll({
      where,
      include: [{ model: DrugstoreOrderItem, as: "items" }],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async exportOrdersCsv(input: Omit<ListOrderInput, "page" | "limit">) {
    const where = buildWhereClause(input);

    const rows = await DrugstoreOrder.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 5000,
    });

    const headers = [
      "orderId",
      "sourceOrderId",
      "paymentReference",
      "paymentStatus",
      "deliveryStatus",
      "legacyStatus",
      "recipientName",
      "recipientPhone",
      "totalAmount",
      "currency",
      "placedAt",
      "paymentVerifiedAt",
      "createdAt",
    ];

    const lines = rows.map((row) =>
      [
        row.id,
        row.sourceOrderId,
        row.paymentReference,
        row.paymentStatus,
        row.deliveryStatus,
        row.status,
        row.recipientName,
        row.recipientPhone,
        row.totalAmount,
        row.currency,
        toIsoString(row.placedAt),
        toIsoString(row.paymentVerifiedAt),
        toIsoString(row.createdAt),
      ]
        .map(csvEscape)
        .join(",")
    );

    return [headers.join(","), ...lines].join("\n");
  }

  static async getOrderById(merchantId: string, orderId: string) {
    return DrugstoreOrder.findOne({
      where: { merchantId, id: orderId },
      include: [{ model: DrugstoreOrderItem, as: "items" }],
    });
  }

  static async updateDeliveryStatus(
    merchantId: string,
    orderId: string,
    payload: { deliveryStatus: DeliveryStatus; note?: string }
  ) {
    const order = await DrugstoreOrder.findOne({
      where: { merchantId, id: orderId },
      include: [{ model: DrugstoreOrderItem, as: "items" }],
    });

    if (!order) {
      throw new Error("Drugstore order not found");
    }

    if (order.deliveryStatus === payload.deliveryStatus) {
      return order;
    }

    const previousStatus = order.deliveryStatus;
    const legacyStatus =
      payload.deliveryStatus === "delivered"
        ? "delivered"
        : payload.deliveryStatus === "cancelled"
          ? "cancelled"
          : payload.deliveryStatus === "picked_up" || payload.deliveryStatus === "in_transit"
            ? "ready"
            : "processing";

    await order.update({
      deliveryStatus: payload.deliveryStatus,
      status: legacyStatus,
      metadata: {
        ...(order.metadata || {}),
        lastDeliveryStatusChange: {
          from: previousStatus,
          to: payload.deliveryStatus,
          note: payload.note || null,
          changedAt: new Date().toISOString(),
        },
      },
    });

    await ExperienceOneInternalClient.post("/api/v1/main/drugstore/internal/orders/status-sync", {
      sourceOrderId: order.sourceOrderId,
      merchantOrderId: order.id,
      deliveryStatus: payload.deliveryStatus,
      note: payload.note || null,
    });

    return order;
  }

  static async getAnalyticsKpis(merchantId: string, filters: DateFilterInput = {}) {
    const window = resolveAnalyticsWindow(filters);

    const [currentOrders, previousOrders, currentProducts, previousProducts] = await Promise.all([
      fetchAnalyticsOrders(merchantId, window.start, window.end),
      fetchAnalyticsOrders(merchantId, window.previousStart, window.previousEnd),
      Product.count({
        where: {
          merchantId,
          isActive: true,
          createdAt: { [Op.lte]: window.end },
        },
      }),
      Product.count({
        where: {
          merchantId,
          isActive: true,
          createdAt: { [Op.lte]: window.previousEnd },
        },
      }),
    ]);

    const currentTotalEarned = roundMoney(
      currentOrders.reduce((sum, row) => {
        if (row.paymentStatus !== "paid") return sum;
        return sum + toNumber(row.totalAmount);
      }, 0)
    );

    const previousTotalEarned = roundMoney(
      previousOrders.reduce((sum, row) => {
        if (row.paymentStatus !== "paid") return sum;
        return sum + toNumber(row.totalAmount);
      }, 0)
    );

    const commissionRate = applicationConfig.drugstoreAnalytics.commissionRate;
    const currentCommission = roundMoney(currentTotalEarned * commissionRate);
    const previousCommission = roundMoney(previousTotalEarned * commissionRate);

    const currentTotalOrders = currentOrders.length;
    const previousTotalOrders = previousOrders.length;

    return {
      range: window.range,
      timeWindow: buildFilterSummary(window),
      commissionRate,
      metrics: {
        totalEarned: {
          value: currentTotalEarned,
          growthPercentage: calculateGrowth(currentTotalEarned, previousTotalEarned),
        },
        totalCommission: {
          value: currentCommission,
          growthPercentage: calculateGrowth(currentCommission, previousCommission),
        },
        totalOrders: {
          value: currentTotalOrders,
          growthPercentage: calculateGrowth(currentTotalOrders, previousTotalOrders),
        },
        totalProducts: {
          value: currentProducts,
          growthPercentage: calculateGrowth(currentProducts, previousProducts),
        },
      },
    };
  }

  static async getAnalyticsSalesSeries(merchantId: string, filters: DateFilterInput = {}) {
    const window = resolveAnalyticsWindow(filters);
    const rows = await fetchAnalyticsOrders(merchantId, window.start, window.end);

    const buckets = buildSeriesBuckets(window);
    const bucketMap = new Map<
      string,
      { label: string; salesAmount: number; orderCount: number; uniqueUsers: Set<string> }
    >();

    buckets.forEach((bucket) => {
      bucketMap.set(bucket.key, {
        label: bucket.label,
        salesAmount: 0,
        orderCount: 0,
        uniqueUsers: new Set<string>(),
      });
    });

    rows.forEach((row) => {
      const placedAt = toDate(row.placedAt);
      const bucketKey = formatBucketKey(placedAt, window.bucketGranularity);
      const entry = bucketMap.get(bucketKey);
      if (!entry) return;

      entry.orderCount += 1;
      if (row.sourceUserId !== undefined && row.sourceUserId !== null) {
        entry.uniqueUsers.add(String(row.sourceUserId));
      }
      if (row.paymentStatus === "paid") {
        entry.salesAmount += toNumber(row.totalAmount);
      }
    });

    const series: AnalyticsBucket[] = buckets.map((bucket) => {
      const entry = bucketMap.get(bucket.key);
      return {
        key: bucket.key,
        label: bucket.label,
        salesAmount: roundMoney(entry?.salesAmount || 0),
        orderCount: entry?.orderCount || 0,
        uniqueUsers: entry?.uniqueUsers.size || 0,
      };
    });

    return {
      range: window.range,
      timeWindow: {
        ...buildFilterSummary(window),
      },
      series,
      totals: {
        salesAmount: roundMoney(series.reduce((sum, item) => sum + item.salesAmount, 0)),
        orderCount: series.reduce((sum, item) => sum + item.orderCount, 0),
        uniqueUsers: new Set(
          rows
            .map((row) => row.sourceUserId)
            .filter((value) => value !== undefined && value !== null)
            .map((value) => String(value))
        ).size,
      },
    };
  }

  static async getAnalyticsOrderBreakdown(merchantId: string, filters: DateFilterInput = {}) {
    const window = resolveAnalyticsWindow(filters);
    const rows = await fetchAnalyticsOrders(merchantId, window.start, window.end);

    const counts = {
      pending: 0,
      delivered: 0,
      cancelled: 0,
    };

    rows.forEach((row) => {
      if (row.deliveryStatus === "pending") counts.pending += 1;
      if (row.deliveryStatus === "delivered") counts.delivered += 1;
      if (row.deliveryStatus === "cancelled") counts.cancelled += 1;
    });

    const trackedTotal = counts.pending + counts.delivered + counts.cancelled;
    const toPercent = (count: number): number => {
      if (trackedTotal === 0) return 0;
      return roundPercentage((count / trackedTotal) * 100);
    };

    return {
      range: window.range,
      timeWindow: {
        ...buildFilterSummary(window),
      },
      totalOrders: rows.length,
      trackedTotal,
      counts,
      percentages: {
        pending: toPercent(counts.pending),
        delivered: toPercent(counts.delivered),
        cancelled: toPercent(counts.cancelled),
      },
    };
  }

  static async getAnalyticsTopSellingProducts(
    merchantId: string,
    filters: TopSellingInput = {},
    limitValue?: number
  ) {
    const explicitRange = resolveExplicitDateRange(filters.startDate, filters.endDate);
    const analyticsWindow = explicitRange || filters.range ? resolveAnalyticsWindow(filters) : null;
    const period = analyticsWindow ? null : resolveTopSellingPeriod(filters.period);
    const window = analyticsWindow
      ? { start: analyticsWindow.start, end: analyticsWindow.end }
      : getTopSellingWindow(period!);
    const limit = Math.max(1, Math.min(50, Number(limitValue || 5)));

    const orderWhere: any = { merchantId };
    if (window.start && window.end) {
      orderWhere.placedAt = {
        [Op.between]: [window.start, window.end],
      };
    }

    const rows = (await DrugstoreOrderItem.findAll({
      attributes: ["merchantProductId", "productNameSnapshot", "quantity", "lineTotal", "orderId"],
      include: [
        {
          model: DrugstoreOrder,
          as: "order",
          required: true,
          where: orderWhere,
          attributes: ["id"],
        },
      ],
      raw: true,
      nest: true,
    })) as Array<{
      merchantProductId: string;
      productNameSnapshot: string;
      quantity: string | number;
      lineTotal: string | number;
      orderId: string;
    }>;

    const aggregation = new Map<
      string,
      {
        merchantProductId: string;
        productName: string;
        quantitySold: number;
        totalAmount: number;
        orderIds: Set<string>;
      }
    >();

    rows.forEach((row) => {
      const key = row.merchantProductId;
      const current = aggregation.get(key) || {
        merchantProductId: row.merchantProductId,
        productName: row.productNameSnapshot,
        quantitySold: 0,
        totalAmount: 0,
        orderIds: new Set<string>(),
      };

      current.quantitySold += toNumber(row.quantity);
      current.totalAmount += toNumber(row.lineTotal);
      current.orderIds.add(String(row.orderId));

      aggregation.set(key, current);
    });

    const items = Array.from(aggregation.values())
      .sort((first, second) => {
        if (second.quantitySold !== first.quantitySold) {
          return second.quantitySold - first.quantitySold;
        }
        return second.totalAmount - first.totalAmount;
      })
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        merchantProductId: item.merchantProductId,
        productName: item.productName,
        quantitySold: item.quantitySold,
        totalAmount: roundMoney(item.totalAmount),
        orderCount: item.orderIds.size,
      }));

    return {
      period,
      range: analyticsWindow?.range || null,
      startAt: window.start ? window.start.toISOString() : null,
      endAt: window.end ? window.end.toISOString() : null,
      items,
    };
  }

  static async getAnalyticsRecentProductSales(
    merchantId: string,
    filters: DateFilterInput = {},
    pageValue?: number,
    limitValue?: number
  ) {
    const window = resolveAnalyticsWindow(filters);
    const page = Math.max(1, Number(pageValue || 1));
    const limit = Math.max(1, Math.min(100, Number(limitValue || 20)));
    const offset = (page - 1) * limit;

    const { rows, count } = await DrugstoreOrderItem.findAndCountAll({
      include: [
        {
          model: DrugstoreOrder,
          as: "order",
          required: true,
          where: buildRangeWhere(merchantId, window.start, window.end),
          attributes: ["id", "sourceOrderId", "recipientName", "placedAt"],
        },
      ],
      order: [[{ model: DrugstoreOrder, as: "order" }, "placedAt", "DESC"], ["createdAt", "DESC"]] as any,
      limit,
      offset,
    });

    const items = rows.map((row) => {
      const order = (row as any).order as
        | {
            id: string;
            sourceOrderId: string;
            recipientName: string;
            placedAt: Date | string;
          }
        | undefined;

      return {
        orderId: order?.id || row.orderId,
        sourceOrderId: order?.sourceOrderId || null,
        customerName: order?.recipientName || null,
        productName: row.productNameSnapshot,
        quantity: toNumber(row.quantity),
        amount: roundMoney(toNumber(row.lineTotal)),
        placedAt: order?.placedAt ? toDate(order.placedAt).toISOString() : null,
      };
    });

    const total = Number(count);

    return {
      range: window.range,
      timeWindow: {
        ...buildFilterSummary(window),
      },
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDashboard(merchantId: string, filters: DateFilterInput = {}) {
    const window = resolveAnalyticsWindow(filters);
    const [kpis, salesTrend, orderBreakdown, topSellingProducts, recentProductSales] = await Promise.all([
      this.getAnalyticsKpis(merchantId, filters),
      this.getAnalyticsSalesSeries(merchantId, filters),
      this.getAnalyticsOrderBreakdown(merchantId, filters),
      this.getAnalyticsTopSellingProducts(merchantId, filters, 5),
      this.getAnalyticsRecentProductSales(merchantId, filters, 1, 5),
    ]);

    return {
      filters: buildFilterSummary(window),
      kpis: kpis.metrics,
      salesTrend,
      orderBreakdown,
      topSellingProducts,
      recentProductSales,
    };
  }
}
