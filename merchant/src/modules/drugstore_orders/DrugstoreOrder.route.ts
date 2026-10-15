import { Router } from "express";
import { ownerOnly, requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import {
	exportDrugstoreOrdersCsv,
	listDrugstoreOrders,
	seedDrugstoreOrders,
	updateDrugstoreOrderStatus,
} from "./DrugstoreOrder.controller";

const router = Router();

router.post("/seed", ownerOnly(), seedDrugstoreOrders);
router.get("/", requirePermission("orders.view"), listDrugstoreOrders);
router.get("/export.csv", requirePermission("orders.view", "data.export"), exportDrugstoreOrdersCsv);
router.patch("/:orderId/status", requirePermission("orders.manage"), audit("order.status_updated"), updateDrugstoreOrderStatus);
// router.get("/:orderId", getDrugstoreOrderById);

export default router;
