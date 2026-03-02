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
const Category_service_1 = require("../Category.service");
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const merchantId = (_a = req.merchant) === null || _a === void 0 ? void 0 : _a.id;
        const { categoryId } = req.params;
        if (!merchantId) {
            res.status(401);
            res.response = {
                message: "Unauthorized",
                statusCode: 401,
            };
            return next();
        }
        if (!categoryId || Array.isArray(categoryId)) {
            res.status(400);
            res.response = {
                message: "Invalid category ID",
                statusCode: 400,
            };
            return next();
        }
        const result = yield Category_service_1.CategoryService.deleteCategory(merchantId, categoryId);
        res.status(200);
        res.response = {
            message: result.message,
            statusCode: 200,
            data: null,
        };
        return next();
    }
    catch (error) {
        return next(error);
    }
});
