import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { createCustomerUserName } from "./controllers/CreateCustomerUserName.controller";
import { completeCustomerProfile } from "./controllers/CompleteCustomerProfile.controller";
import { medicCompleteProfile } from "./controllers/MedicCompleteProfile.controller";
import { getMedicsBySpeciality } from "./controllers/GetMedicsBySpeciality.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.post("/customer/username", verifyToken, createCustomerUserName);
router.post("/customer/profile", verifyToken, completeCustomerProfile);
router.post("/medic/complete-profile", verifyToken, medicCompleteProfile);
router.get("/medics/speciality/:specialityId", verifyToken, getMedicsBySpeciality);

export default router;
