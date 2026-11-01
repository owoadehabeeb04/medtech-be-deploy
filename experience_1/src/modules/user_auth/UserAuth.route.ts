import express from "express";
import rateLimit from "express-rate-limit";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import {
	changePassword,
	completeSignup,
	login,
	googleLogin,
	logout,
	me,
	refreshToken,
	register,
	requestForgotPasswordOtp,
	requestSignupOtp,
	resendForgotPasswordOtp,
	resendSignupOtp,
	resetPassword,
	verifyForgotPasswordOtp,
	verifySignupOtp,
} from "./controllers/Auth.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.post("/signup/register", register);
router.post("/signup/request-otp", requestSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);
router.post("/signup/resend-otp", resendSignupOtp);
router.post("/signup/complete", completeSignup);
router.post("/login", login);
router.post("/google", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), googleLogin);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password/request-otp", requestForgotPasswordOtp);
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp);
router.post("/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/reset-password", resetPassword);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, me);
router.post("/change-password", verifyToken, requireRole(AUTH_ROLE.DOCTOR), changePassword);

export default router;
