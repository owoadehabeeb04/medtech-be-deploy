import { NextFunction, Request, Response } from "express";
import { HttpException } from "@medtech/utils";
import { DrugstoreInternalService } from "./DrugstoreInternal.service";

const requiredQuery = (req: Request, key: string): string => {
  const value = String(req.query[key] || "").trim();
  if (!value) {
    throw new HttpException(400, `${key} query param is required`);
  }
  return value;
};

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = requiredQuery(req, "merchantId");

    const data = await DrugstoreInternalService.listProducts({
      merchantId,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      sortBy: req.query.sortBy ? (String(req.query.sortBy) as any) : undefined,
      sortDirection: req.query.sortDirection ? (String(req.query.sortDirection) as any) : undefined,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Products retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = requiredQuery(req, "merchantId");
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      throw new HttpException(400, "productId param is required");
    }

    const data = await DrugstoreInternalService.getProduct(merchantId, productId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Product retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = requiredQuery(req, "merchantId");
    const data = await DrugstoreInternalService.listCategories(merchantId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Categories retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const listNearbyPharmacies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DrugstoreInternalService.listNearbyPharmacies({
      search: req.query.search ? String(req.query.search) : undefined,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      activeCartMerchantId: req.query.activeCartMerchantId ? String(req.query.activeCartMerchantId) : undefined,
      activeCartItemCount: req.query.activeCartItemCount ? Number(req.query.activeCartItemCount) : undefined,
      activeCartSubtotal: req.query.activeCartSubtotal ? Number(req.query.activeCartSubtotal) : undefined,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Nearby pharmacies retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getPharmacyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = String(req.params.merchantId || "").trim();
    if (!merchantId) {
      throw new HttpException(400, "merchantId param is required");
    }

    const data = await DrugstoreInternalService.getPharmacyProfile(merchantId);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Pharmacy profile retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getPharmacyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = String(req.params.merchantId || "").trim();
    if (!merchantId) {
      throw new HttpException(400, "merchantId param is required");
    }

    const data = await DrugstoreInternalService.getPharmacyReviews(
      merchantId,
      Number(req.query.page || 1),
      Number(req.query.limit || 20)
    );

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Pharmacy reviews retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateDiscount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = String(req.body?.merchantId || "").trim();
    const code = String(req.body?.code || "").trim().toUpperCase();
    const orderAmount = Number(req.body?.orderAmount || 0);
    const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];

    if (!merchantId || !code || !Array.isArray(productIds) || productIds.length === 0) {
      throw new HttpException(400, "merchantId, code and productIds are required");
    }

    const data = await DrugstoreInternalService.validateDiscount({
      merchantId,
      code,
      orderAmount,
      productIds,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Discount validated successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const reflectOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DrugstoreInternalService.reflectPaidOrder(req.body);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Order reflection processed",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
