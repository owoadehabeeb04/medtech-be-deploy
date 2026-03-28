import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import { createCustomerUserName } from "./controllers/CreateCustomerUserName.controller";
import { completeCustomerProfile } from "./controllers/CompleteCustomerProfile.controller";
import { medicCompleteProfile } from "./controllers/MedicCompleteProfile.controller";
import { getMedicsBySpeciality } from "./controllers/GetMedicsBySpeciality.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

// Deprecated legacy routes. Prefer /api/v1/main/consumer/profile and /api/v1/main/doctor/profile/*.
router.post("/customer/username", verifyToken, requireRole(AUTH_ROLE.CONSUMER), createCustomerUserName);
router.post("/customer/profile", verifyToken, requireRole(AUTH_ROLE.CONSUMER), completeCustomerProfile);
router.post("/medic/complete-profile", verifyToken, requireRole(AUTH_ROLE.DOCTOR), medicCompleteProfile);
router.get(
	"/medics/speciality/:specialityId",
	verifyToken,
	requireRole(AUTH_ROLE.CONSUMER, AUTH_ROLE.DOCTOR),
	getMedicsBySpeciality
);

export default router;
