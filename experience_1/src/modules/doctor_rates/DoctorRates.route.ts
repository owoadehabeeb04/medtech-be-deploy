import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import {
	getDoctorRates,
	replaceDoctorSubscriptionPlans,
	upsertDoctorConsultationRate,
} from "./DoctorRates.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.use(verifyToken, requireRole(AUTH_ROLE.DOCTOR));
router.get("/rates", getDoctorRates);
router.put("/rates/consultation", upsertDoctorConsultationRate);
router.put("/rates/subscription-plans", replaceDoctorSubscriptionPlans);

export default router;
