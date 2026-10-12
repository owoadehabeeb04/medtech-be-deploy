import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { signup } from "./controllers/Signup.controller";
import { resendOtp } from "./controllers/ResendOtp.controller";
import { checkPhone } from "./controllers/CheckPhone.controller";
import { verifyOtp } from "./controllers/VerifyOtp.controller";
import { completeSignup } from "./controllers/CompleteSignup.controller";
import { login } from "./controllers/Login.controller";
import { forgotPassword } from "./controllers/ForgotPassword.controller";
import { verifyResetOtp } from "./controllers/VerifyResetOtp.controller";
import { resetPassword } from "./controllers/ResetPassword.controller";
import { refreshToken } from "./controllers/RefreshToken.controller";

const router: Router = express.Router();

// Rate limiting for OTP endpoints (stricter)
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: {
    status: 429,
    message: "Too many OTP requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resend has its own limiter so a user retrying a lost code isn't locked out by the verify limiter
const resendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: "Too many OTP requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// check-phone runs as the user fills the signup form, so it gets a separate, roomier budget
const checkPhoneRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup flow
router.post("/signup", signup);
router.post("/resend-otp", resendRateLimiter, resendOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp);
router.post("/check-phone", checkPhoneRateLimiter, checkPhone);
router.post("/complete-signup", completeSignup);

// Login
router.post("/login", login);

// Password reset flow
router.post("/forgot-password", otpRateLimiter, forgotPassword);
router.post("/verify-reset-otp", otpRateLimiter, verifyResetOtp);
router.post("/reset-password", resetPassword);

// Refresh token
router.post("/refresh-token", refreshToken);

export default router;
