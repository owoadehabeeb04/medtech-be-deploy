import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { getDrugstoreOrdersDashboard } from "./DrugstoreOrder.controller";

const router = Router();

router.get("/", requirePermission("dashboard.view"), getDrugstoreOrdersDashboard);

export default router;
