import { Router } from "express";

import GetProductsController from "./controllers/GetProducts.controller";
import GetProductController from "./controllers/GetProduct.controller";
import CreateProductController from "./controllers/CreateProduct.controller";
import UpdateProductController from "./controllers/UpdateProduct.controller";
import DeleteProductController from "./controllers/DeleteProduct.controller";
import UpdateProductStockController from "./controllers/UpdateProductStock.controller";
import GetLowStockProductsController from "./controllers/GetLowStockProducts.controller";
import GetProductStatsController from "./controllers/GetProductStats.controller";
import RestoreProductController from "./controllers/RestoreProduct.controller";

const productRouter: Router = Router();

/**
 * UUID v4 regex
 * This ensures ONLY valid UUIDs ever hit productId routes
 */
const UUID =
  ":productId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";

/**
 * ─────────────────────────────────────────────
 * STATIC ROUTES (MUST COME FIRST)
 * ─────────────────────────────────────────────
 */
productRouter.get("/stats", GetProductStatsController);
productRouter.get("/low-stock", GetLowStockProductsController);
productRouter.get("/", GetProductsController);

/**
 * ─────────────────────────────────────────────
 * UUID-ONLY ROUTES
 * ─────────────────────────────────────────────
 */
productRouter.get(`/${UUID}`, GetProductController);
productRouter.patch(`/${UUID}`, UpdateProductController);
productRouter.patch(`/${UUID}/stock`, UpdateProductStockController);
productRouter.delete(`/${UUID}`, DeleteProductController);
productRouter.post(`/${UUID}/restore`, RestoreProductController);

/**
 * ─────────────────────────────────────────────
 * CREATE
 * ─────────────────────────────────────────────
 */
productRouter.post("/", CreateProductController);

export default productRouter;
