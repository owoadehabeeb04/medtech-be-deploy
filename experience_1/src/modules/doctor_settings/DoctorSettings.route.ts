import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import {
	deleteDoctorDeviceToken,
	getDoctorSettings,
	updateDoctorSettingsPreferences,
	upsertDoctorDeviceToken,
} from "./DoctorSettings.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.use(verifyToken, requireRole(AUTH_ROLE.DOCTOR));
router.get("/settings", getDoctorSettings);
router.patch("/settings/preferences", updateDoctorSettingsPreferences);
router.post("/settings/device-token", upsertDoctorDeviceToken);
router.delete("/settings/device-tokens/:deviceId", deleteDoctorDeviceToken);

export default router;
