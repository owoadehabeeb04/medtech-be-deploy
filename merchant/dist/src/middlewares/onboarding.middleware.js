"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOnboarding = void 0;
const error_codes_1 = require("../constants/error-codes");
/**
 * Middleware to check if merchant has completed onboarding
 * Apply this to routes that require full merchant setup
 */
const requireOnboarding = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors } = req.context;
    const merchant = req.merchant;
    if (!merchant) {
        return next(manageApplicationErrors({
            message: "Authentication required",
            statusCode: 401,
            errorCode: error_codes_1.ERROR_CODES.UNAUTHORIZED,
        }));
    }
    if (!merchant.onboardingCompleted) {
        return res.status(403).json({
            status: false,
            code: 403,
            message: "Please complete your onboarding to access this feature",
            data: {
                currentStep: merchant.onboardingStep,
                onboardingUrl: "/api/v1/merchant/onboarding/status",
                completed: {
                    terms: merchant.termsAccepted,
                    validId: !!merchant.validIdUrl,
                    profile: !!merchant.profilePictureUrl,
                    bank: merchant.bankVerified,
                },
            },
        });
    }
    next();
});
exports.requireOnboarding = requireOnboarding;
