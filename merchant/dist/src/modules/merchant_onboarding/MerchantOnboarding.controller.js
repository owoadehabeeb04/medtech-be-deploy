"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBankAccount = exports.uploadProfilePicture = exports.uploadValidId = exports.acceptTerms = exports.getOnboardingStatus = void 0;
const http_status_1 = require("http-status");
const MerchantOnboarding_service_1 = require("./MerchantOnboarding.service");
const MerchantOnboarding_schema_1 = require("./MerchantOnboarding.schema");
const error_codes_1 = require("../../constants/error-codes");
const getOnboardingStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
            errorCode: error_codes_1.ERROR_CODES.UNAUTHORIZED,
        }));
    }
    const merchantId = String(user.id);
    const [error, data] = yield manageAsyncOps(MerchantOnboarding_service_1.MerchantOnboardingService.getOnboardingStatus(merchantId));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    res.status(http_status_1.OK);
    res.response = {
        message: data.message,
        statusCode: http_status_1.OK,
        data: data.data,
    };
    return next();
});
exports.getOnboardingStatus = getOnboardingStatus;
const acceptTerms = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
            errorCode: error_codes_1.ERROR_CODES.UNAUTHORIZED,
        }));
    }
    const merchantId = String(user.id);
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value: payload } = validateSchema(MerchantOnboarding_schema_1.AcceptTermsSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: http_status_1.BAD_REQUEST,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    const [error, data] = yield manageAsyncOps(MerchantOnboarding_service_1.MerchantOnboardingService.acceptTerms(merchantId, payload));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    res.status(http_status_1.OK);
    res.response = {
        message: data.message,
        statusCode: http_status_1.OK,
        data: data.data,
    };
    return next();
});
exports.acceptTerms = acceptTerms;
const uploadValidId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
        }));
    }
    const merchantId = String(user.id);
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value: payload } = validateSchema(MerchantOnboarding_schema_1.UploadValidIdSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: http_status_1.BAD_REQUEST,
        }));
    }
    const [error, data] = yield manageAsyncOps(MerchantOnboarding_service_1.MerchantOnboardingService.uploadValidId(merchantId, payload.validIdUrl));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code,
        }));
    }
    const responsePayload = {
        message: data.message,
        statusCode: http_status_1.OK,
        data: data.data,
    };
    return res.status(http_status_1.OK).json(responsePayload);
});
exports.uploadValidId = uploadValidId;
const uploadProfilePicture = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
        }));
    }
    const merchantId = String(user.id);
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value: payload } = validateSchema(MerchantOnboarding_schema_1.UploadProfilePictureSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: http_status_1.BAD_REQUEST,
        }));
    }
    const [error, data] = yield manageAsyncOps(MerchantOnboarding_service_1.MerchantOnboardingService.uploadProfilePicture(merchantId, payload.profilePictureUrl));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code,
        }));
    }
    const responsePayload = {
        message: data.message,
        statusCode: http_status_1.OK,
        data: data.data,
    };
    return res.status(http_status_1.OK).json(responsePayload);
});
exports.uploadProfilePicture = uploadProfilePicture;
const verifyBankAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
            errorCode: error_codes_1.ERROR_CODES.UNAUTHORIZED,
        }));
    }
    const merchantId = String(user.id);
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value: payload } = validateSchema(MerchantOnboarding_schema_1.VerifyBankSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: http_status_1.BAD_REQUEST,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    const [error, data] = yield manageAsyncOps(MerchantOnboarding_service_1.MerchantOnboardingService.verifyBankAccount(merchantId, payload));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    res.status(http_status_1.OK);
    res.response = {
        message: data.message,
        statusCode: http_status_1.OK,
        data: data.data,
    };
    return next();
});
exports.verifyBankAccount = verifyBankAccount;
