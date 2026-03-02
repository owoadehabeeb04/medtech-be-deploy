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
const Product_service_1 = require("../Product.service");
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const merchantId = (_a = req.merchant) === null || _a === void 0 ? void 0 : _a.id;
        if (!merchantId) {
            res.status(401);
            res.response = {
                message: "Unauthorized",
                statusCode: 401,
            };
            return next();
        }
        const stats = yield Product_service_1.ProductService.getProductStats(merchantId);
        res.status(200);
        res.response = {
            message: "Product statistics retrieved successfully",
            statusCode: 200,
            data: stats,
        };
        return next();
    }
    catch (error) {
        return next(error);
    }
});
