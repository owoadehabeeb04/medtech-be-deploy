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
    try {
        const { user } = req.context;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401);
            res.response = {
                message: "Authentication required",
                statusCode: 401,
            };
            return next();
        }
        const merchantId = String(user.id);
        const { page = "1", limit = "20", search, category, status, isActive, } = req.query;
        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search: search,
            category: category,
            status: status,
            isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        };
        const products = yield Product_service_1.ProductService.getAllProducts(merchantId, options);
        res.status(200);
        res.response = {
            message: "Products retrieved successfully",
            statusCode: 200,
            data: products,
        };
        return next();
    }
    catch (error) {
        return next(error);
    }
});
