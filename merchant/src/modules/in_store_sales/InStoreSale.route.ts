import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import {
  createInStoreSale,
  cancelInStoreSale,
  exportInStoreSalesCsv,
  getInStoreSaleById,
  listInStoreSaleProducts,
  listInStoreSales,
  refundInStoreSale,
  returnInStoreSale,
} from "./InStoreSale.controller";

const router = Router();

// Static paths must be registered before /:orderId.

router.get("/products", requirePermission("sales.create"), listInStoreSaleProducts);

router.get("/export.csv", requirePermission("sales.view", "data.export"), exportInStoreSalesCsv);

router.get("/", requireAnyPermission("sales.view", "sales.view_own"), listInStoreSales);

router.post("/", requirePermission("sales.create"), audit("sale.created"), createInStoreSale);

router.post("/:orderId/cancel", requirePermission("sales.cancel"), audit("sale.cancelled"), cancelInStoreSale);

router.post("/:orderId/return", requirePermission("sales.refund"), audit("sale.returned"), returnInStoreSale);

router.post("/:orderId/refund", requirePermission("sales.refund"), audit("sale.refunded"), refundInStoreSale);

router.get("/:orderId", requireAnyPermission("sales.view", "sales.view_own"), getInStoreSaleById);

export default router;
