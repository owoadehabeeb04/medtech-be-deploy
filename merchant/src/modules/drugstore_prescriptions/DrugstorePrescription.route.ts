import { Router } from "express";
import { listDrugstorePrescriptions, reviewDrugstorePrescription } from "./DrugstorePrescription.controller";

const router = Router();

router.get("/", listDrugstorePrescriptions);
router.post("/:prescriptionId/review", reviewDrugstorePrescription);

export default router;
