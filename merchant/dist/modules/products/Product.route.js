"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GetProducts_controller_1 = __importDefault(require("./controllers/GetProducts.controller"));
const GetProduct_controller_1 = __importDefault(require("./controllers/GetProduct.controller"));
const CreateProduct_controller_1 = __importDefault(require("./controllers/CreateProduct.controller"));
const UpdateProduct_controller_1 = __importDefault(require("./controllers/UpdateProduct.controller"));
const DeleteProduct_controller_1 = __importDefault(require("./controllers/DeleteProduct.controller"));
const UpdateProductStock_controller_1 = __importDefault(require("./controllers/UpdateProductStock.controller"));
const GetLowStockProducts_controller_1 = __importDefault(require("./controllers/GetLowStockProducts.controller"));
const GetProductStats_controller_1 = __importDefault(require("./controllers/GetProductStats.controller"));
const RestoreProduct_controller_1 = __importDefault(require("./controllers/RestoreProduct.controller"));
const productRouter = (0, express_1.Router)();
/**
 * UUID v4 regex
 * This ensures ONLY valid UUIDs ever hit productId routes
 */
const UUID = ":productId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";
/**
 * ─────────────────────────────────────────────
 * STATIC ROUTES (MUST COME FIRST)
 * ─────────────────────────────────────────────
 */
productRouter.get("/stats", GetProductStats_controller_1.default);
productRouter.get("/low-stock", GetLowStockProducts_controller_1.default);
productRouter.get("/", GetProducts_controller_1.default);
/**
 * ─────────────────────────────────────────────
 * UUID-ONLY ROUTES
 * ─────────────────────────────────────────────
 */
productRouter.get(`/${UUID}`, GetProduct_controller_1.default);
productRouter.patch(`/${UUID}`, UpdateProduct_controller_1.default);
productRouter.patch(`/${UUID}/stock`, UpdateProductStock_controller_1.default);
productRouter.delete(`/${UUID}`, DeleteProduct_controller_1.default);
productRouter.post(`/${UUID}/restore`, RestoreProduct_controller_1.default);
/**
 * ─────────────────────────────────────────────
 * CREATE
 * ─────────────────────────────────────────────
 */
productRouter.post("/", CreateProduct_controller_1.default);
exports.default = productRouter;
