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
exports.verifyOtp = void 0;
const http_status_1 = require("http-status");
const MerchantAuth_schema_1 = require("../MerchantAuth.schema");
const MerchantAuth_service_1 = require("../MerchantAuth.service");
const error_codes_1 = require("../../../constants/error-codes");
const verifyOtp = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody2 } = req.context;
    const cleanBody = sanitizeBody2(req.body);
    const { error: validationError, value: payload } = validateSchema(MerchantAuth_schema_1.VerifyOtpSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: http_status_1.BAD_REQUEST,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    const [error, data] = yield manageAsyncOps(MerchantAuth_service_1.MerchantAuthService.verifyOtp(payload));
    if (error) {
        console.log(error);
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    if (!data.status) {
        return next(manageApplicationErrors({
            message: data.message,
            statusCode: data.code || http_status_1.BAD_REQUEST,
        }));
    }
    const responsePayload = {
        status: data.code,
        message: data.message,
        data: data.data,
    };
    return res.status(data.code).json(responsePayload);
});
exports.verifyOtp = verifyOtp;
