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
exports.updateStore = void 0;
const MerchantSettings_service_1 = require("../MerchantSettings.service");
const MerchantSettings_schema_1 = require("../MerchantSettings.schema");
const updateStore = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps, validateSchema, sanitizeBody, user } = req.context;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
        }));
    }
    const merchantId = String(user.id);
    const cleanBody = sanitizeBody(req.body);
    const { error: validationError, value } = validateSchema(MerchantSettings_schema_1.updateStoreSchema, cleanBody);
    if (validationError) {
        return next(manageApplicationErrors({
            message: validationError,
            statusCode: 400,
        }));
    }
    const [error, result] = yield manageAsyncOps(MerchantSettings_service_1.MerchantSettingsService.updateStore(merchantId, value));
    if (error) {
        return next(manageApplicationErrors({
            message: error.message,
            statusCode: 500,
        }));
    }
    return res.status(result.code).json({
        message: result.message,
        statusCode: result.code,
        data: result.data,
    });
});
exports.updateStore = updateStore;
