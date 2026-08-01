import { NextFunction, Request, Response } from "express";
import { HttpException, validateSchema } from "@medtech/utils";
import {
  cancelInStoreSaleSchema,
  createInStoreSaleSchema,
  refundInStoreSaleSchema,
  returnInStoreSaleSchema,
} from "./InStoreSale.schema";
import { InStoreSaleService } from "./InStoreSale.service";

const getMerchantId = (req: Request): string => {
  const merchantId = String(req.context.user?.id || "").trim();
  if (!merchantId) {
    throw new HttpException(401, "Authentication required");
  }
  return merchantId;
};

const sendData = (res: Response, message: string, data: unknown, statusCode = 200) => {
  res.status(statusCode);
  res.response = { statusCode, message, data };
};

const getActionPayload = (req: Request) => ({
  ...(req.body || {}),
  idempotencyKey: req.body?.idempotencyKey || req.get("Idempotency-Key") || undefined,
});

const getOrderId = (req: Request): string => {
  const orderId = String(req.params.orderId || "").trim();
  if (!orderId) throw new HttpException(400, "orderId path parameter is required");
  return orderId;
};

export const listInStoreSaleProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await InStoreSaleService.listProductOptions(
      getMerchantId(req),
      req.query.search ? String(req.query.search) : undefined,
      Number(req.query.limit || 20)
    );
    sendData(res, "In-store sale products retrieved successfully", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const createInStoreSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateSchema(createInStoreSaleSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { statusCode: 400, message: error };
      return next();
    }

    const data = await InStoreSaleService.createSale(getMerchantId(req), {
      ...value,
      idempotencyKey: value.idempotencyKey || req.get("Idempotency-Key") || undefined,
    });

    sendData(res, "In-store sale created successfully", data, 201);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const listInStoreSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await InStoreSaleService.listSales({
      merchantId: getMerchantId(req),
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: req.query.search ? String(req.query.search) : undefined,
      paymentStatus: req.query.paymentStatus ? String(req.query.paymentStatus) : undefined,
      deliveryStatus: req.query.deliveryStatus ? String(req.query.deliveryStatus) : undefined,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
      sortDirection: req.query.sortDirection ? String(req.query.sortDirection) : undefined,
    });

    sendData(res, "In-store sales retrieved successfully", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getInStoreSaleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = getOrderId(req);
    const data = await InStoreSaleService.getSaleById(getMerchantId(req), orderId);
    if (!data) {
      throw new HttpException(
        404,
        `In-store sale ${orderId} was not found for this merchant`
      );
    }

    sendData(res, "In-store sale retrieved successfully", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const cancelInStoreSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateSchema(cancelInStoreSaleSchema, getActionPayload(req));
    if (error) {
      res.status(400);
      res.response = { statusCode: 400, message: error };
      return next();
    }

    const data = await InStoreSaleService.cancelSale(getMerchantId(req), getOrderId(req), value);
    sendData(res, "In-store sale cancelled successfully. Inventory was restored.", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const returnInStoreSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateSchema(returnInStoreSaleSchema, getActionPayload(req));
    if (error) {
      res.status(400);
      res.response = { statusCode: 400, message: error };
      return next();
    }

    const data = await InStoreSaleService.returnSale(getMerchantId(req), getOrderId(req), value);
    sendData(res, "In-store sale return recorded successfully.", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const refundInStoreSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateSchema(refundInStoreSaleSchema, getActionPayload(req));
    if (error) {
      res.status(400);
      res.response = { statusCode: 400, message: error };
      return next();
    }

    const data = await InStoreSaleService.refundSale(getMerchantId(req), getOrderId(req), value);
    sendData(res, "In-store sale refund recorded successfully.", data);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const exportInStoreSalesCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await InStoreSaleService.exportSalesCsv({
      merchantId: getMerchantId(req),
      search: req.query.search ? String(req.query.search) : undefined,
      paymentStatus: req.query.paymentStatus ? String(req.query.paymentStatus) : undefined,
      deliveryStatus: req.query.deliveryStatus ? String(req.query.deliveryStatus) : undefined,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
      sortDirection: req.query.sortDirection ? String(req.query.sortDirection) : undefined,
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="in-store-sales-${dateStamp}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};
