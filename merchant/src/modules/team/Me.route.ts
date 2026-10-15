import { Router } from "express";
import { changeMyPassword, getMe, getMyPharmacies, switchPharmacy, updateMyProfile } from "./Team.controller";
import { anyMember } from "../../middlewares/permission.middleware";

const router: Router = Router();

router.get("/", anyMember(), getMe);
router.get("/pharmacies", anyMember(), getMyPharmacies);
router.post("/switch-pharmacy", anyMember(), switchPharmacy);
router.patch("/profile", anyMember(), updateMyProfile);
router.post("/password", anyMember(), changeMyPassword);

export default router;
