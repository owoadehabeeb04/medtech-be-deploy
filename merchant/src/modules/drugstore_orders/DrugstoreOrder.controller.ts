import { NextFunction, Request, Response } from "express";
import { HttpException } from "@medtech/utils";
import { DrugstoreOrderService } from "./DrugstoreOrder.service";

const parseQueryArray = (value: unknown): string[] | string | undefined => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return trimmed;
  }
  return undefined;
};

const getMerchantId = (req: Request): string => {
  const merchantId = String(req.context.user?.id || "").trim();
  if (!merchantId) {
    throw new HttpException(401, "Authentication required");
  }
  return merchantId;
};

const getDateFilters = (req: Request) => ({
  range: req.query.range ? String(req.query.range) : undefined,
  startDate: req.query.startDate ? String(req.query.startDate) : undefined,
  endDate: req.query.endDate ? String(req.query.endDate) : undefined,
});

export const listDrugstoreOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.listOrders({
      merchantId,
      ...getDateFilters(req),
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      status: req.query.status as string | string[] | undefined,
      paymentStatus: parseQueryArray(req.query.paymentStatus),
      deliveryStatus: parseQueryArray(req.query.deliveryStatus),
      dateRange: req.query.dateRange as any,
      ageBucket: req.query.ageBucket as any,
      search: req.query.search ? String(req.query.search) : undefined,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore orders retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/analytics/kpis:
 *   get:
 *     summary: "Get drugstore order analytics KPIs"
 *     description: "Get drugstore order analytics KPIs for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_analytics_kpis"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/analytics/sales:
 *   get:
 *     summary: "Get drugstore order analytics sales"
 *     description: "Get drugstore order analytics sales for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_analytics_sales"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/analytics/order-breakdown:
 *   get:
 *     summary: "Get drugstore order analytics order breakdown"
 *     description: "Get drugstore order analytics order breakdown for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_analytics_order_breakdown"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/analytics/top-selling-products:
 *   get:
 *     summary: "Get drugstore order analytics top selling products"
 *     description: "Get drugstore order analytics top selling products for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_analytics_top_selling_products"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/analytics/recent-product-sales:
 *   get:
 *     summary: "Get drugstore order analytics recent product sales"
 *     description: "Get drugstore order analytics recent product sales for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_analytics_recent_product_sales"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/dashboard:
 *   get:
 *     summary: "Get drugstore orders dashboard"
 *     description: "Get drugstore orders dashboard for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_dashboard"
 *     tags: ["Dashboard & Analytics"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/drugstore-orders/seed:
 *   post:
 *     summary: "Seed drugstore orders"
 *     description: "Seed drugstore orders for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_drugstore_orders_seed"
 *     tags: ["Drugstore Orders"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */

/**
 * @swagger
 * /api/v1/merchant/drugstore-orders:
 *   get:
 *     summary: "List drugstore orders"
 *     description: "List drugstore orders for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_drugstore_orders"
 *     tags: ["Drugstore Orders"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/drugstore-orders/export.csv:
 *   get:
 *     summary: "Export drugstore orders CSV"
 *     description: "Returns a CSV export."
 *     operationId: "merchant_get_api_v1_merchant_drugstore_orders_export_csv"
 *     tags: ["Drugstore Orders"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "CSV export generated successfully"
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/drugstore-orders/{orderId}/status:
 *   patch:
 *     summary: "Update drugstore order status"
 *     description: "Update drugstore order status for the merchant API."
 *     operationId: "merchant_patch_api_v1_merchant_drugstore_orders_orderId_status"
 *     tags: ["Drugstore Orders"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 *       409:
 *         description: "Business rule conflict"
 */

export const seedDrugstoreOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.seedMerchantOrders(merchantId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore sample orders seeded successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const exportDrugstoreOrdersCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const csv = await DrugstoreOrderService.exportOrdersCsv({
      merchantId,
      ...getDateFilters(req),
      status: req.query.status as string | string[] | undefined,
      paymentStatus: parseQueryArray(req.query.paymentStatus),
      deliveryStatus: parseQueryArray(req.query.deliveryStatus),
      dateRange: req.query.dateRange as any,
      ageBucket: req.query.ageBucket as any,
      search: req.query.search ? String(req.query.search) : undefined,
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"drugstore-orders-${dateStamp}.csv\"`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const orderId = String(req.params.orderId || "").trim();
    if (!orderId) {
      throw new HttpException(400, "orderId param is required");
    }

    const data = await DrugstoreOrderService.getOrderById(merchantId, orderId);
    if (!data) {
      throw new HttpException(404, "Drugstore order not found");
    }

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore order retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const updateDrugstoreOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const orderId = String(req.params.orderId || "").trim();
    if (!orderId) {
      throw new HttpException(400, "orderId param is required");
    }

    const deliveryStatus = String(req.body?.deliveryStatus || "").trim() as
      | "pending"
      | "picked_up"
      | "in_transit"
      | "delivered"
      | "cancelled";

    if (!["pending", "picked_up", "in_transit", "delivered", "cancelled"].includes(deliveryStatus)) {
      throw new HttpException(400, "Valid deliveryStatus is required");
    }

    const data = await DrugstoreOrderService.updateDeliveryStatus(merchantId, orderId, {
      deliveryStatus,
      note: req.body?.note ? String(req.body.note) : undefined,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore order status updated successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrdersDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getDashboard(merchantId, getDateFilters(req));

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore dashboard retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderAnalyticsKpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsKpis(merchantId, getDateFilters(req));

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore analytics KPIs retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderAnalyticsSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsSalesSeries(merchantId, getDateFilters(req));

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore analytics sales series retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderAnalyticsOrderBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsOrderBreakdown(merchantId, getDateFilters(req));

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore analytics order breakdown retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderAnalyticsTopSellingProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsTopSellingProducts(
      merchantId,
      {
        ...getDateFilters(req),
        period: req.query.period ? String(req.query.period) : undefined,
      },
      Number(req.query.limit || 5)
    );

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore analytics top selling products retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getDrugstoreOrderAnalyticsRecentProductSales = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsRecentProductSales(
      merchantId,
      getDateFilters(req),
      Number(req.query.page || 1),
      Number(req.query.limit || 20)
    );

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore analytics recent product sales retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
