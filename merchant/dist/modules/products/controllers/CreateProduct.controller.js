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
const Product_schema_1 = require("../Product.schema");
const utils_1 = require("@medtech/utils");
const Category_service_1 = require("../../categories/Category.service");
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
        const { error, value } = (0, utils_1.validateSchema)(Product_schema_1.createProductSchema, req.body);
        if (error) {
            res.status(400);
            res.response = {
                message: error,
                statusCode: 400,
            };
            return next();
        }
        if (value.category) {
            const categoryNames = yield Category_service_1.CategoryService.getCategoryNames(merchantId);
            if (!categoryNames.includes(value.category.trim())) {
                res.status(400);
                res.response = {
                    message: `Invalid category. Available categories: ${categoryNames.join(", ")}`,
                    statusCode: 400,
                };
                return next();
            }
            value.category = value.category.trim();
        }
        const product = yield Product_service_1.ProductService.createProduct(merchantId, value);
        res.status(201);
        res.response = {
            message: "Product created successfully",
            statusCode: 201,
            data: product,
        };
        return next();
    }
    catch (error) {
        return next(error);
    }
});
