import { Router } from "express";
import {
	exportDrugstoreOrdersCsv,
	listDrugstoreOrders,
	seedDrugstoreOrders,
	updateDrugstoreOrderStatus,
} from "./DrugstoreOrder.controller";

const router = Router();

router.post("/seed", seedDrugstoreOrders);
router.get("/", listDrugstoreOrders);
router.get("/export.csv", exportDrugstoreOrdersCsv);
router.patch("/:orderId/status", updateDrugstoreOrderStatus);
// router.get("/:orderId", getDrugstoreOrderById);

export default router;
