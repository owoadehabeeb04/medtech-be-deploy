import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireDoctorOnboardingCompleted } from "../../middlewares/doctor-onboarding.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { getAllMedicAppointments } from "./controllers/GetAllMedicsAppointment.controller";
import { bookAppointment } from "./controllers/BookAppointment.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.get("/", verifyToken, requireRole(AUTH_ROLE.DOCTOR), requireDoctorOnboardingCompleted, getAllMedicAppointments);
router.post("/book", verifyToken, bookAppointment);

export default router;
