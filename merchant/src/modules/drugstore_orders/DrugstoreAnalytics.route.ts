import { Router } from "express";
import {
	getDrugstoreOrderAnalyticsKpis,
	getDrugstoreOrderAnalyticsOrderBreakdown,
	getDrugstoreOrderAnalyticsRecentProductSales,
	getDrugstoreOrderAnalyticsSales,
	getDrugstoreOrderAnalyticsTopSellingProducts,
} from "./DrugstoreOrder.controller";

const router = Router();

router.get("/kpis", getDrugstoreOrderAnalyticsKpis);
router.get("/sales", getDrugstoreOrderAnalyticsSales);
router.get("/order-breakdown", getDrugstoreOrderAnalyticsOrderBreakdown);
router.get("/top-selling-products", getDrugstoreOrderAnalyticsTopSellingProducts);
router.get("/recent-product-sales", getDrugstoreOrderAnalyticsRecentProductSales);

export default router;
