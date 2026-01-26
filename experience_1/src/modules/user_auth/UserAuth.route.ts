import express from "express";
const router = express.Router();
import { login } from "./controllers/Login.controller";
import { signup } from "./controllers/SignUp.controller";
import { verifyOtp } from "./controllers/VerifyOtp.controller";
import { resetPassword } from "./controllers/ResetPassword.controller";
import { setPassword } from "./controllers/SetPassword.controller";
import { requestOtp } from "./controllers/RequestOtp.controller";

router.post("/:userType/signup", signup);
router.post("/:userType/login", login);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/set-password", setPassword);

export default router;
