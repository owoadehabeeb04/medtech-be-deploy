"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Signup_controller_1 = require("./controllers/Signup.controller");
const VerifyOtp_controller_1 = require("./controllers/VerifyOtp.controller");
const CompleteSignup_controller_1 = require("./controllers/CompleteSignup.controller");
const Login_controller_1 = require("./controllers/Login.controller");
const ForgotPassword_controller_1 = require("./controllers/ForgotPassword.controller");
const VerifyResetOtp_controller_1 = require("./controllers/VerifyResetOtp.controller");
const ResetPassword_controller_1 = require("./controllers/ResetPassword.controller");
const RefreshToken_controller_1 = require("./controllers/RefreshToken.controller");
const router = express_1.default.Router();
// Rate limiting for OTP endpoints (stricter)
const otpRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per 15 minutes
    message: {
        status: 429,
        message: "Too many OTP requests. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Signup flow
router.post("/signup", Signup_controller_1.signup);
router.post("/verify-otp", otpRateLimiter, VerifyOtp_controller_1.verifyOtp);
router.post("/complete-signup", CompleteSignup_controller_1.completeSignup);
// Login
router.post("/login", Login_controller_1.login);
// Password reset flow
router.post("/forgot-password", otpRateLimiter, ForgotPassword_controller_1.forgotPassword);
router.post("/verify-reset-otp", otpRateLimiter, VerifyResetOtp_controller_1.verifyResetOtp);
router.post("/reset-password", ResetPassword_controller_1.resetPassword);
// Refresh token
router.post("/refresh-token", RefreshToken_controller_1.refreshToken);
console.log("Merchant auth routes:", router.stack
    .filter((l) => l.route)
    .map((l) => l.route.path));
exports.default = router;
