import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import {
	addressIdParamSchema,
	addCartItemSchema,
	cancelOrderSchema,
	confirmOrderPaymentSchema,
	createOrderSchema,
	getCatalogProductsQuerySchema,
	itemIdParamSchema,
	listOrdersQuerySchema,
	merchantIdParamSchema,
	nearbyPharmaciesQuerySchema,
	orderIdParamSchema,
	prescriptionIdParamSchema,
	productIdParamSchema,
	reviewPrescriptionSchema,
	submitPrescriptionSchema,
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

export const getCatalogProducts: RequestHandler = async (req, res, next) => {
	const { validateSchema, manageAsyncOps } = req.context;
	const query = validateSchema(getCatalogProductsQuerySchema, req.query, next);
	if (!query) return;

	const [error, result] = await manageAsyncOps(DrugstoreService.getCatalogProducts(query));
	if (error) return handleServiceError(req, next, error, "D101");
	return handleResult(req, res, next, result);
};

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

export const getPharmacyProfile: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(merchantIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstorePharmacyService.getPharmacyProfile(params.merchantId));
	if (error) return handleServiceError(req, next, error, "D127");
	return handleResult(req, res, next, result);
};

export const getPharmacyReviews: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(merchantIdParamSchema, req.params, next);
	if (!params) return;

	const [error, result] = await req.context.manageAsyncOps(
		DrugstorePharmacyService.getPharmacyReviews(params.merchantId, Number(req.query.page || 1), Number(req.query.limit || 20))
	);
	if (error) return handleServiceError(req, next, error, "D128");
	return handleResult(req, res, next, result);
};

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

export const validateCatalogDiscount: RequestHandler = async (req, res, next) => {
	const payload = req.context.validateSchema(validateCatalogDiscountSchema, req.body, next);
	if (!payload) return;

	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.validateCatalogDiscount(payload));
	if (error) return handleServiceError(req, next, error, "D106");
	return handleResult(req, res, next, result);
};

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

export const syncMerchantOrderStatus: RequestHandler = async (req, res, next) => {
	const [error, result] = await req.context.manageAsyncOps(DrugstoreService.syncMerchantOrderStatus(req.body));
	if (error) return handleServiceError(req, next, error, "D149");
	return handleResult(req, res, next, result);
};
