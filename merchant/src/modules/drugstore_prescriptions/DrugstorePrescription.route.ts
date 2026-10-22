import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import { listDrugstorePrescriptions, reviewDrugstorePrescription } from "./DrugstorePrescription.controller";

const router = Router();

router.get("/", requirePermission("prescriptions.view"), listDrugstorePrescriptions);
router.post("/:prescriptionId/review", requirePermission("prescriptions.review"), audit("prescription.reviewed"), reviewDrugstorePrescription);

export default router;
