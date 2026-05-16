import { Router } from "express";
import { getDrugstoreOrdersDashboard } from "./DrugstoreOrder.controller";

const router = Router();

router.get("/", getDrugstoreOrdersDashboard);

export default router;
