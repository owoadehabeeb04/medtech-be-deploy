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

const parseBrands = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
};

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // merchantId is optional here on purpose: omitting it browses/searches across every
    // pharmacy (used by the consumer app's global search and category drill-down), while
    // supplying it scopes the listing to a single pharmacy's catalog as before.
    const merchantId = req.query.merchantId ? String(req.query.merchantId).trim() : undefined;

    const data = await DrugstoreInternalService.listProducts({
      merchantId,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      brands: parseBrands(req.query.brand),
      priceMin: req.query.priceMin !== undefined ? Number(req.query.priceMin) : undefined,
      priceMax: req.query.priceMax !== undefined ? Number(req.query.priceMax) : undefined,
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
/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/top-selling-products:
 *   get:
 *     summary: "Get top selling products"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_top_selling_products"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalTopSellingProductsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/product-brands:
 *   get:
 *     summary: "Get distinct brands"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_product_brands"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalDistinctBrandsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/products:
 *   get:
 *     summary: "List products"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_products"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalListProductsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/products/{productId}:
 *   get:
 *     summary: "Get product"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_products_productId"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalProductResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 *       404:
 *         description: "Requested resource was not found"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/categories:
 *   get:
 *     summary: "List categories"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_categories"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalCategoriesResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/nearby-pharmacies:
 *   get:
 *     summary: "List nearby pharmacies"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_nearby_pharmacies"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalNearbyPharmaciesResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/pharmacies/{merchantId}:
 *   get:
 *     summary: "Get pharmacy profile"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_pharmacies_merchantId"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalPharmacyProfileResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 *       404:
 *         description: "Requested resource was not found"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/pharmacies/{merchantId}/reviews:
 *   get:
 *     summary: "Get pharmacy reviews"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_get_api_v1_merchant_internal_drugstore_pharmacies_merchantId_reviews"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InternalPharmacyReviewsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 *       404:
 *         description: "Requested resource was not found"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/discounts/validate:
 *   post:
 *     summary: "Validate discount"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_post_api_v1_merchant_internal_drugstore_discounts_validate"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
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
 *               $ref: "#/components/schemas/ValidateDiscountCodeResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 *       409:
 *         description: "Business rule conflict"
 */

/**
 * @swagger
 * /api/v1/merchant/internal/drugstore/orders/reflect:
 *   post:
 *     summary: "Reflect order"
 *     description: "Signed service-to-service merchant endpoint."
 *     operationId: "merchant_post_api_v1_merchant_internal_drugstore_orders_reflect"
 *     tags: ["Internal Drugstore"]
 *     security: [{ internalAuth: [] }]
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
 *               $ref: "#/components/schemas/InternalReflectOrderResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Missing or invalid internal authentication signature"
 *       409:
 *         description: "Business rule conflict"
 */

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

export const getDistinctBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;
    const merchantId = req.query.merchantId ? String(req.query.merchantId).trim() : undefined;
    const data = await DrugstoreInternalService.getDistinctBrands({ category, merchantId });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Brands retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const getTopSellingProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));
    const data = await DrugstoreInternalService.getTopSellingProducts(limit);

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Top selling products retrieved successfully",
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

const parseActiveCarts = (value: unknown): Array<{ merchantId: string; itemCount: number; subtotal: number }> => {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.merchantId === "string")
      .map((entry) => ({
        merchantId: entry.merchantId,
        itemCount: Number(entry.itemCount || 0),
        subtotal: Number(entry.subtotal || 0),
      }));
  } catch (_error) {
    return [];
  }
};

export const listNearbyPharmacies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DrugstoreInternalService.listNearbyPharmacies({
      search: req.query.search ? String(req.query.search) : undefined,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      // A caller can have one active cart per pharmacy simultaneously, so this is a list, JSON-encoded
      // by experience_1's DrugstoreMerchantClient which only carries flat query values otherwise.
      activeCarts: parseActiveCarts(req.query.activeCarts),
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getPharmacyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = String(req.params.merchantId || "").trim();
    if (!merchantId) {
      throw new HttpException(400, "merchantId param is required");
    }
    // /pharmacies/nearby is registered ahead of this route, but its handler completes via next()
    // rather than ending the response, so Express keeps matching — a non-UUID merchantId here
    // means some other /pharmacies/* route's path segment fell through to this one.
    if (!UUID_PATTERN.test(merchantId)) {
      throw new HttpException(404, "Pharmacy not found");
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
    if (!UUID_PATTERN.test(merchantId)) {
      throw new HttpException(404, "Pharmacy not found");
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
