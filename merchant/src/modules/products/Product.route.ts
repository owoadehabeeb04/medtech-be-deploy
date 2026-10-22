import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";

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
productRouter.get("/stats", requirePermission("products.view"), GetProductStatsController);
productRouter.get("/low-stock", requirePermission("products.view"), GetLowStockProductsController);
productRouter.get("/", requirePermission("products.view"), GetProductsController);

/**
 * ─────────────────────────────────────────────
 * UUID-ONLY ROUTES
 * ─────────────────────────────────────────────
 */
productRouter.get(`/${UUID}`, requirePermission("products.view"), GetProductController);
productRouter.patch(`/${UUID}`, requirePermission("products.manage"), audit("product.updated"), UpdateProductController);
productRouter.patch(`/${UUID}/stock`, requirePermission("products.update_stock"), audit("product.stock_updated"), UpdateProductStockController);
productRouter.delete(`/${UUID}`, requirePermission("products.manage"), audit("product.deleted"), DeleteProductController);
productRouter.post(`/${UUID}/restore`, requirePermission("products.manage"), audit("product.restored"), RestoreProductController);

/**
 * ─────────────────────────────────────────────
 * CREATE
 * ─────────────────────────────────────────────
 */
productRouter.post("/", requirePermission("products.manage"), audit("product.created"), CreateProductController);

export default productRouter;
