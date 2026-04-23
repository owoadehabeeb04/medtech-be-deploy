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

export const listDrugstoreOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.listOrders({
      merchantId,
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

export const exportDrugstoreOrdersCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const csv = await DrugstoreOrderService.exportOrdersCsv({
      merchantId,
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

export const getDrugstoreOrderAnalyticsKpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstoreOrderService.getAnalyticsKpis(merchantId, req.query.range as string | undefined);

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
    const data = await DrugstoreOrderService.getAnalyticsSalesSeries(
      merchantId,
      req.query.range as string | undefined
    );

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
    const data = await DrugstoreOrderService.getAnalyticsOrderBreakdown(
      merchantId,
      req.query.range as string | undefined
    );

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
      req.query.period as string | undefined,
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
      req.query.range as string | undefined,
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
