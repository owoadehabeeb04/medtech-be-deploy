import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	addressIdParamSchema,
	addCartItemSchema,
	cancelOrderSchema,
	catalogBrandsQuerySchema,
	confirmOrderPaymentSchema,
	createOrderSchema,
	getCatalogProductsQuerySchema,
	itemIdParamSchema,
	listOrdersQuerySchema,
	merchantIdParamSchema,
	nearbyPharmaciesQuerySchema,
	orderIdParamSchema,
	prescriptionIdParamSchema,
	productAvailabilityQuerySchema,
	productIdParamSchema,
	reviewPrescriptionSchema,
	submitPrescriptionSchema,
	topSellingProductsQuerySchema,
	upsertDrugstoreAddressSchema,
	updateCartItemSchema,
	validateCatalogDiscountSchema,
} from "./Drugstore.schema";
import { DrugstoreService } from "./Drugstore.service";
import { DrugstorePharmacyService } from "./DrugstorePharmacy.service";
import { DrugstoreAddressService } from "./DrugstoreAddress.service";
import { DrugstorePrescriptionService } from "./DrugstorePrescription.service";

const OK = 200;
const UNAUTHORIZED = 401;
const INTERNAL_SERVER_ERROR = 500;

// /pharmacies/nearby is registered ahead of /pharmacies/:merchantId, but its handler completes via
// next() rather than ending the response — so a successful nearby-pharmacies request would
// otherwise also match this route (merchantId="nearby") and clobber the real response with a
// validation error. Skipping (bare next()) instead of validating lets that response through.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (value: unknown): boolean => UUID_PATTERN.test(String(value || ""));

const getUserId = (req: Request): number | null => {
	const id = Number(req.context.user?.id);
	if (Number.isNaN(id) || id <= 0) return null;
	return id;
};

const handleResult = (req: Request, res: Response, next: NextFunction, result: any) => {
	if (!result?.status) {
		return next(
			req.context.manageApplicationErrors({
				message: result?.message || "Request failed",
				statusCode: result?.code || 400,
				errorCode: req.context.errorCode(ERR_USER, "D500"),
			})
		);
	}

	res.response = {
		statusCode: result.code || OK,
		message: result.message,
		data: req.context.encrypt(result.data),
	};

	return next();
};

const handleServiceError = (req: Request, next: NextFunction, error: any, fallbackCode: string) => {
	const statusCode = error?.response?.status || error?.statusCode || INTERNAL_SERVER_ERROR;
	const message = error?.response?.data?.message || error?.message || "Server error";
	return next(
		req.context.manageApplicationErrors({
			message,
			statusCode,
			errorCode: req.context.errorCode(ERR_USER, fallbackCode),
		})
	);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/products:
 *   get:
 *     summary: List catalog products
 *     description: "Passthrough to the merchant service's product catalog. Omit merchantId to search/browse across every pharmacy at once (used for global search and category drill-down) — supply it to scope to a single pharmacy's catalog."
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: merchantId
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Omit for a cross-pharmacy search/browse.
 *       - name: brand
 *         in: query
 *         schema: { type: array, items: { type: string } }
 *         style: form
 *         explode: true
 *         description: Repeat the param for multiple brands, e.g. brand=Pfizer&brand=GSK. Fetch the valid values from GET /drugstore/catalog/brands.
 *       - name: priceMin
 *         in: query
 *         schema: { type: number, minimum: 0 }
 *       - name: priceMax
 *         in: query
 *         schema: { type: number, minimum: 0 }
 *       - name: sortBy
 *         in: query
 *         schema: { type: string, enum: [createdAt, price, name], default: createdAt }
 *       - name: sortDirection
 *         in: query
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/CatalogProductsResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getCatalogProducts: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const query = validateSchema(getCatalogProductsQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await manageAsyncOps(DrugstoreService.getCatalogProducts(query));
	if (error) return handleServiceError(req, next, error, "D101");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/brands:
 *   get:
 *     summary: List distinct brand values available for filtering
 *     description: Powers the Filters → Brands screen's checkbox list. Cross-pharmacy by default; narrow with category and/or merchantId.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: merchantId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { type: object, properties: { brands: { type: array, items: { type: string }, example: ["GlaxoSmithKline", "Pfizer"] } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getCatalogBrands: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const query = validateSchema(catalogBrandsQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await manageAsyncOps(DrugstoreService.getCatalogBrands(query.category, query.merchantId));
	if (error) return handleServiceError(req, next, error, "D101B");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/top-selling:
 *   get:
 *     summary: List top-selling products across all pharmacies
 *     description: Cross-pharmacy ranking by cumulative units sold (paid orders only). Unlike the other catalog endpoints, this is not scoped to a single merchantId.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { type: object, properties: { products: { type: array, items: { $ref: '#/components/schemas/CatalogProductResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getTopSellingProducts: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const query = validateSchema(topSellingProductsQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await manageAsyncOps(DrugstoreService.getTopSellingProducts(query.limit));
	if (error) return handleServiceError(req, next, error, "D101A");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/pharmacies/nearby:
 *   get:
 *     summary: List nearby pharmacies
 *     description: Resolves latitude/longitude from the given addressId, or explicit latitude/longitude, or falls back to the caller's default address. Each pharmacy is enriched with the caller's active-cart summary for that merchant.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: addressId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: latitude
 *         in: query
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *       - name: longitude
 *         in: query
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/NearbyPharmaciesResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listNearbyPharmacies: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D100"),
			})
		);
	}

	const query = req.context.validateSchema(nearbyPharmaciesQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstorePharmacyService.listNearbyPharmacies(userId, query));
	if (error) return handleServiceError(req, next, error, "D126");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/pharmacies/{merchantId}:
 *   get:
 *     summary: Get a pharmacy's public profile
 *     description: Passthrough to the merchant service's public store profile.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/PharmacyProfileResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getPharmacyProfile: RequestHandler = async (req, res, next) => {
	if (!looksLikeUuid(req.params.merchantId)) return next();

	const params = req.context.validateSchema(merchantIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstorePharmacyService.getPharmacyProfile(params.merchantId));
	if (error) return handleServiceError(req, next, error, "D127");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/pharmacies/{merchantId}/reviews:
 *   get:
 *     summary: List a pharmacy's reviews
 *     description: Passthrough to the merchant service's reviews for the given pharmacy.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/PharmacyReviewsResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getPharmacyReviews: RequestHandler = async (req, res, next) => {
	if (!looksLikeUuid(req.params.merchantId)) return next();

	const params = req.context.validateSchema(merchantIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePharmacyService.getPharmacyReviews(params.merchantId, Number(req.query.page || 1), Number(req.query.limit || 20))
	);
	if (error) return handleServiceError(req, next, error, "D128");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/products/{productId}:
 *   get:
 *     summary: Get a single catalog product
 *     description: Passthrough to a single merchant product. Requires a merchantId query param since product IDs are merchant-scoped.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: merchantId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/CatalogProductResponse' }
 *       400: { description: merchantId query param is required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getCatalogProduct: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const params = validateSchema(productIdParamSchema, req.params, next);
	if (!params) return;

	const merchantId = String(req.query.merchantId || "").trim();
	if (!merchantId) {
		return next(
			req.context.manageApplicationErrors({
				message: "merchantId query param is required",
				statusCode: 400,
				errorCode: req.context.errorCode(ERR_USER, "D102"),
			})
		);
	}

	const [error, result] = await manageAsyncOps(DrugstoreService.getCatalogProduct(params.productId, merchantId));
	if (error) return handleServiceError(req, next, error, "D103");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/products/{productId}/availability:
 *   get:
 *     summary: Check whether a pharmacy has a product available
 *     description: >
 *       Lightweight pre-flight check for the frontend to call before enabling/disabling an
 *       "Add to Cart" button, or right before actually adding an item (to catch stock changes
 *       since the catalog list was loaded). Runs the exact same rules POST /drugstore/cart/items
 *       uses (isActive, inventory, minQuantity/maxQuantity) but does not touch the cart, so it's
 *       safe to call repeatedly. Since stock is per-pharmacy, the same product can be available
 *       from one merchant and unavailable from another.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: merchantId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Pharmacy to check stock against — the same product ID can exist across multiple merchants with independent stock.
 *       - name: quantity
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Quantity the caller intends to add — checked against the pharmacy's minQuantity/maxQuantity/inventory for this product.
 *     responses:
 *       200:
 *         description: Success — check `data.available`, not the HTTP status, to determine availability
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/ProductAvailabilityResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Product not found for this pharmacy, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const checkProductAvailability: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const params = validateSchema(productIdParamSchema, req.params, next);
	if (!params) return;

	const query = validateSchema(productAvailabilityQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await manageAsyncOps(
		DrugstoreService.checkProductAvailability(query.merchantId, params.productId, query.quantity)
	);
	if (error) return handleServiceError(req, next, error, "D160");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/categories:
 *   get:
 *     summary: List catalog categories for a pharmacy
 *     description: Passthrough to the merchant service's category list. Requires a merchantId query param.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/CatalogCategoriesResponse' }
 *       400: { description: merchantId query param is required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getCatalogCategories: RequestHandler = async (req, res, next) => {
	const merchantId = String(req.query.merchantId || "").trim();
	if (!merchantId) {
		return next(
			req.context.manageApplicationErrors({
				message: "merchantId query param is required",
				statusCode: 400,
				errorCode: req.context.errorCode(ERR_USER, "D104"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.getCatalogCategories(merchantId));
	if (error) return handleServiceError(req, next, error, "D105");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/catalog/discounts/validate:
 *   post:
 *     summary: Validate a discount code
 *     description: Passthrough validation against the merchant service.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DiscountValidateRequest' }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DiscountValidateResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const validateCatalogDiscount: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(validateCatalogDiscountSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.validateCatalogDiscount(payload));
	if (error) return handleServiceError(req, next, error, "D106");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/cart:
 *   get:
 *     summary: Get the caller's active cart(s)
 *     description: >
 *       A caller can hold one active cart per pharmacy simultaneously. Supply merchantId to get
 *       that specific pharmacy's cart (a single object, or null if none). Omit it to list every
 *       pharmacy the caller currently has an active cart at (an array) — this powers the nearby
 *       pharmacies screen's "N Items" summaries and the "Order Items" review overlay. Each item
 *       carries a live available/availabilityReason pair re-checked against current stock, since
 *       the snapshot taken at add-time can go stale by the time the cart is viewed.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Omit to list active carts across every pharmacy instead of one.
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/DrugstoreCartResponse'
 *                     - type: array
 *                       items: { $ref: '#/components/schemas/DrugstoreCartResponse' }
 *                   description: A single cart (or null) when merchantId is supplied; an array of every active cart otherwise.
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getActiveCart: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D107"),
			})
		);
	}

	const merchantId = req.query.merchantId ? String(req.query.merchantId) : undefined;
	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.getCart(userId, merchantId));
	if (error) return handleServiceError(req, next, error, "D108");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/cart/items:
 *   post:
 *     summary: Add an item to the cart
 *     description: Adds to (or creates) the caller's active cart for the given pharmacy. Carts from different pharmacies coexist independently — adding an item at a new pharmacy does not disturb any cart already active elsewhere.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AddCartItemRequest' }
 *     responses:
 *       200:
 *         description: Success — returns the recalculated cart for this pharmacy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DrugstoreCartResponse' }
 *       400: { description: Validation failed, product unavailable, or quantity exceeds available stock, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const addCartItem: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D109"),
			})
		);
	}

	const payload = req.context.validateSchema(addCartItemSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.addCartItem(userId, payload));
	if (error) return handleServiceError(req, next, error, "D110");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/cart/items/{itemId}:
 *   patch:
 *     summary: Update a cart item's quantity
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateCartItemRequest' }
 *     responses:
 *       200:
 *         description: Success — returns the recalculated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DrugstoreCartResponse' }
 *       400: { description: Validation failed, or quantity exceeds available stock, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Cart item not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateCartItem: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D111"),
			})
		);
	}

	const params = req.context.validateSchema(itemIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(updateCartItemSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.updateCartItem(userId, params.itemId, payload));
	if (error) return handleServiceError(req, next, error, "D112");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/cart/items/{itemId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success — returns the recalculated cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DrugstoreCartResponse' }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Cart item not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const removeCartItem: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D113"),
			})
		);
	}

	const params = req.context.validateSchema(itemIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.removeCartItem(userId, params.itemId));
	if (error) return handleServiceError(req, next, error, "D114");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/addresses:
 *   get:
 *     summary: List the caller's delivery addresses
 *     description: Ordered by default first, then most recently created.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/DrugstoreAddressResponse' } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listAddresses: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D129"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(DrugstoreAddressService.list(userId));
	if (error) return handleServiceError(req, next, error, "D130");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/addresses:
 *   post:
 *     summary: Create a delivery address
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DrugstoreAddressRequest' }
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Address created successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreAddressResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createAddress: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D131"),
			})
		);
	}

	const payload = req.context.validateSchema(upsertDrugstoreAddressSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreAddressService.create(userId, payload));
	if (error) return handleServiceError(req, next, error, "D132");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/addresses/{addressId}:
 *   patch:
 *     summary: Update a delivery address
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DrugstoreAddressRequest' }
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Address updated successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreAddressResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Address not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const updateAddress: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D133"),
			})
		);
	}

	const params = req.context.validateSchema(addressIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(upsertDrugstoreAddressSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreAddressService.update(userId, params.addressId, payload));
	if (error) return handleServiceError(req, next, error, "D134");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/addresses/{addressId}:
 *   delete:
 *     summary: Delete a delivery address
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Address deleted successfully" }
 *                 data: { type: object, properties: { id: { type: string, format: uuid } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Address not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const deleteAddress: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D135"),
			})
		);
	}

	const params = req.context.validateSchema(addressIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreAddressService.remove(userId, params.addressId));
	if (error) return handleServiceError(req, next, error, "D136");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/prescriptions/upload:
 *   post:
 *     summary: Upload a prescription file
 *     description: Stores the file in S3 with status "uploaded" and a placeholder all-zero merchantId until it is submitted to a pharmacy via the submit endpoint.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Prescription uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Prescription uploaded successfully" }
 *                 data: { $ref: '#/components/schemas/PrescriptionResponse' }
 *       400: { description: File missing, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const uploadPrescription: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D137"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(DrugstorePrescriptionService.upload(userId, req.file));
	if (error) return handleServiceError(req, next, error, "D138");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/prescriptions/{prescriptionId}/submit:
 *   post:
 *     summary: Submit an uploaded prescription to a pharmacy
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: prescriptionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SubmitPrescriptionRequest' }
 *     responses:
 *       200:
 *         description: Prescription submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Prescription submitted successfully" }
 *                 data: { $ref: '#/components/schemas/PrescriptionResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Prescription not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const submitPrescription: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D139"),
			})
		);
	}

	const params = req.context.validateSchema(prescriptionIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(submitPrescriptionSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePrescriptionService.submit(userId, params.prescriptionId, payload)
	);
	if (error) return handleServiceError(req, next, error, "D140");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/prescriptions:
 *   get:
 *     summary: List the caller's prescriptions
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Optional filter by pharmacy.
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/PrescriptionResponse' } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listPrescriptions: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D141"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePrescriptionService.listForUser(userId, req.query.merchantId ? String(req.query.merchantId) : undefined)
	);
	if (error) return handleServiceError(req, next, error, "D142");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/prescriptions/{prescriptionId}:
 *   get:
 *     summary: Get a single prescription
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: prescriptionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/PrescriptionResponse' }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Prescription not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getPrescriptionById: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D143"),
			})
		);
	}

	const params = req.context.validateSchema(prescriptionIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstorePrescriptionService.getForUser(userId, params.prescriptionId));
	if (error) return handleServiceError(req, next, error, "D144");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/orders:
 *   post:
 *     summary: Check out a pharmacy's active cart
 *     description: >
 *       Creates an order from one of the caller's active carts — a caller can hold one active cart
 *       per pharmacy simultaneously, so merchantId picks which one to check out (required if more
 *       than one is active; inferred if exactly one is). fulfillmentMethod delivery (default)
 *       requires a delivery address and computes a delivery fee; pickup skips both. paymentMethod
 *       wallet/card-with-savedCardId resolve immediately (no redirect); card/bank_transfer without
 *       a saved card initialize a Paystack transaction requiring a follow-up confirm call;
 *       pay_in_store (pickup only) stays pending until the pharmacy confirms payment at pickup.
 *       If any cart item requires it, an approved prescription is required regardless of method.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateOrderRequest' }
 *     responses:
 *       201:
 *         description: Order created and payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Order created and payment initialized successfully" }
 *                 data: { $ref: '#/components/schemas/CreateOrderResponse' }
 *       400: { description: "Cart empty, missing delivery address, product unavailable/insufficient stock, prescription approval required, or active carts at multiple pharmacies without a merchantId to disambiguate", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No active cart found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const createOrder: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D115"),
			})
		);
	}

	const payload = req.context.validateSchema(createOrderSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.createOrder(userId, req.context.user?.role, payload));
	if (error) return handleServiceError(req, next, error, "D116");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/orders/{orderId}/payment/confirm:
 *   post:
 *     summary: Confirm an order's payment
 *     description: Verifies the transaction against Paystack and compares the verified amount to the order total before marking the order paid. Idempotent — confirming an already-paid order with the same reference returns 200 rather than erroring.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ConfirmOrderPaymentRequest' }
 *     responses:
 *       200:
 *         description: Payment confirmed and order queued for merchant sync (or already confirmed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Payment confirmed and order queued for merchant sync" }
 *                 data: { $ref: '#/components/schemas/DrugstoreOrderResponse' }
 *       400: { description: "Payment not successful, or verified amount does not match the order total", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Order not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: "Order already paid with a different payment reference", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const confirmOrderPayment: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D117"),
			})
		);
	}

	const params = req.context.validateSchema(orderIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(confirmOrderPaymentSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.confirmOrderPayment(userId, params.orderId, payload));
	if (error) return handleServiceError(req, next, error, "D118");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/orders:
 *   get:
 *     summary: List the caller's orders
 *     description: paymentStatus and deliveryStatus accept either a single value or an array of values.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *       - name: paymentStatus
 *         in: query
 *         schema: { type: string, enum: [pending, paid, failed] }
 *       - name: deliveryStatus
 *         in: query
 *         schema: { type: string, enum: [pending, picked_up, in_transit, delivered, cancelled] }
 *       - name: dateRange
 *         in: query
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days] }
 *       - name: ageBucket
 *         in: query
 *         schema: { type: string, enum: [lt_24h, between_24h_48h, gt_48h] }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DrugstoreOrdersListResponse' }
 *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listOrders: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D119"),
			})
		);
	}

	const query = req.context.validateSchema(listOrdersQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.listOrders(userId, query));
	if (error) return handleServiceError(req, next, error, "D120");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/orders/{orderId}:
 *   get:
 *     summary: Get a single order
 *     description: Includes items and full status history.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { $ref: '#/components/schemas/DrugstoreOrderResponse' }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Order not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getOrderById: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D121"),
			})
		);
	}

	const params = req.context.validateSchema(orderIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.getOrderById(userId, params.orderId));
	if (error) return handleServiceError(req, next, error, "D122");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel an order
 *     description: Only unpaid, unsynced orders can be cancelled. Idempotent — cancelling an already-cancelled order returns 200 rather than erroring.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CancelOrderRequest' }
 *     responses:
 *       200:
 *         description: Order cancelled successfully (or already cancelled)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Order cancelled successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreOrderResponse' }
 *       400: { description: Only unpaid and unsynced orders can be cancelled, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Authentication required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Order not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const cancelOrder: RequestHandler = async (req, res, next) => {
	const userId = getUserId(req);
	if (!userId) {
		return next(
			req.context.manageApplicationErrors({
				message: "Authentication required",
				statusCode: UNAUTHORIZED,
				errorCode: req.context.errorCode(ERR_USER, "D123"),
			})
		);
	}

	const params = req.context.validateSchema(orderIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(cancelOrderSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.cancelOrder(userId, params.orderId, payload));
	if (error) return handleServiceError(req, next, error, "D124");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/internal/prescriptions:
 *   get:
 *     summary: "[Internal] List a merchant's prescription queue"
 *     description: Called only by the merchant service via HMAC-signed service-to-service auth — not usable from a browser/Swagger UI "Authorize" dialog.
 *     tags: [Drugstore Internal]
 *     security: [{ internalAuth: [] }]
 *     parameters:
 *       - name: merchantId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [uploaded, submitted, approved, rejected, needs_clarification] }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success" }
 *                 data: { type: array, items: { $ref: '#/components/schemas/PrescriptionResponse' } }
 *       400: { description: merchantId query param is required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Missing or invalid internal signature headers, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listMerchantPrescriptionQueue: RequestHandler = async (req, res, next) => {
	const merchantId = String(req.query.merchantId || "").trim();
	if (!merchantId) {
		return next(
			req.context.manageApplicationErrors({
				message: "merchantId query param is required",
				statusCode: 400,
				errorCode: req.context.errorCode(ERR_USER, "D145"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePrescriptionService.listForMerchant(merchantId, req.query.status ? String(req.query.status) : undefined)
	);
	if (error) return handleServiceError(req, next, error, "D146");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/internal/prescriptions/{prescriptionId}/review:
 *   post:
 *     summary: "[Internal] Review a prescription on behalf of a merchant"
 *     description: Called only by the merchant service via HMAC-signed service-to-service auth. merchantId is required in the body even though the caller is merchant-scoped, as a defense-in-depth cross-check.
 *     tags: [Drugstore Internal]
 *     security: [{ internalAuth: [] }]
 *     parameters:
 *       - name: prescriptionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InternalReviewPrescriptionRequest' }
 *     responses:
 *       200:
 *         description: Prescription reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Prescription reviewed successfully" }
 *                 data: { $ref: '#/components/schemas/PrescriptionResponse' }
 *       400: { description: Validation failed, or merchantId is required, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Missing or invalid internal signature headers, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Prescription not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const reviewPrescriptionForMerchant: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(prescriptionIdParamSchema, req.params, next);
	if (!params) return;
	const payload = req.context.validateSchema(reviewPrescriptionSchema, req.body, next);
	if (!payload) return;

	const merchantId = String(req.body?.merchantId || "").trim();
	if (!merchantId) {
		return next(
			req.context.manageApplicationErrors({
				message: "merchantId is required",
				statusCode: 400,
				errorCode: req.context.errorCode(ERR_USER, "D147"),
			})
		);
	}

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePrescriptionService.reviewForMerchant(merchantId, params.prescriptionId, payload)
	);
	if (error) return handleServiceError(req, next, error, "D148");
	return handleResult(req, res, next, result);
};

/**
 * @swagger
 * /api/v1/main/drugstore/internal/orders/status-sync:
 *   post:
 *     summary: "[Internal] Sync an order's delivery/payment status from the merchant"
 *     description: >
 *       Called only by the merchant service via HMAC-signed service-to-service auth. Exactly one
 *       of sourceOrderId/merchantOrderId must be supplied to identify the order, and at least one
 *       of deliveryStatus/paymentStatus. paymentStatus=paid is only accepted for pay_in_store
 *       orders (confirming in-person payment at pickup) and re-triggers the same merchant sync
 *       pipeline every other paid order goes through. Idempotent — resyncing the same status
 *       returns 200 without re-applying it.
 *     tags: [Drugstore Internal]
 *     security: [{ internalAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InternalOrderStatusSyncRequest' }
 *     responses:
 *       200:
 *         description: Order status synchronized successfully (or already synchronized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Order status synchronized successfully" }
 *                 data: { $ref: '#/components/schemas/DrugstoreOrderResponse' }
 *       400: { description: "sourceOrderId/merchantOrderId or deliveryStatus/paymentStatus missing, or paymentStatus=paid sent for a non-pay_in_store order", content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Missing or invalid internal signature headers, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Order not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const syncMerchantOrderStatus: RequestHandler = async (req, res, next) => {
	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.syncMerchantOrderStatus(req.body));
	if (error) return handleServiceError(req, next, error, "D149");
	return handleResult(req, res, next, result);
};
