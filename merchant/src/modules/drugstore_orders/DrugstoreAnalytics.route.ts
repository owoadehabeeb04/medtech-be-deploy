import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
	getDrugstoreOrderAnalyticsKpis,
	getDrugstoreOrderAnalyticsOrderBreakdown,
	getDrugstoreOrderAnalyticsRecentProductSales,
	getDrugstoreOrderAnalyticsSales,
	getDrugstoreOrderAnalyticsTopSellingProducts,
} from "./DrugstoreOrder.controller";

const router = Router();

router.get("/kpis", requirePermission("analytics.view"), getDrugstoreOrderAnalyticsKpis);
router.get("/sales", requirePermission("analytics.view"), getDrugstoreOrderAnalyticsSales);
router.get("/order-breakdown", requirePermission("analytics.view"), getDrugstoreOrderAnalyticsOrderBreakdown);
router.get("/top-selling-products", requirePermission("analytics.view"), getDrugstoreOrderAnalyticsTopSellingProducts);
router.get("/recent-product-sales", requirePermission("analytics.view"), getDrugstoreOrderAnalyticsRecentProductSales);

export default router;
