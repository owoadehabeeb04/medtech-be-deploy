import { Router } from "express";
import {
	exportDrugstoreOrdersCsv,
	listDrugstoreOrders,
	updateDrugstoreOrderStatus,
} from "./DrugstoreOrder.controller";

const router = Router();

router.get("/", listDrugstoreOrders);
router.get("/export.csv", exportDrugstoreOrdersCsv);
router.patch("/:orderId/status", updateDrugstoreOrderStatus);

// Kept commented for later reuse if the merchant UI grows beyond the current orders table flow.
// router.get("/analytics/kpis", getDrugstoreOrderAnalyticsKpis);
// router.get("/analytics/sales", getDrugstoreOrderAnalyticsSales);
// router.get("/analytics/order-breakdown", getDrugstoreOrderAnalyticsOrderBreakdown);
// router.get("/analytics/top-selling-products", getDrugstoreOrderAnalyticsTopSellingProducts);
// router.get("/analytics/recent-product-sales", getDrugstoreOrderAnalyticsRecentProductSales);
// router.get("/:orderId", getDrugstoreOrderById);

export default router;
