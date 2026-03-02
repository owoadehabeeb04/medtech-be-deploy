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
exports.getBankList = void 0;
const http_status_1 = require("http-status");
const Paystack_service_1 = require("../../../service/Paystack/Paystack.service");
const getBankList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps } = req.context;
    const [error, banks] = yield manageAsyncOps(Paystack_service_1.PaystackService.getBankList());
    if (error) {
        return next(manageApplicationErrors({
            message: error.message || "Failed to fetch bank list",
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
        }));
    }
    const responsePayload = {
        message: "Bank list retrieved successfully",
        statusCode: http_status_1.OK,
        data: banks,
    };
    return res.status(http_status_1.OK).json(responsePayload);
});
exports.getBankList = getBankList;
