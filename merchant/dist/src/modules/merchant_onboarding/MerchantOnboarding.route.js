"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const GetOnboardingStatus_controller_1 = require("./controllers/GetOnboardingStatus.controller");
const AcceptTerms_controller_1 = require("./controllers/AcceptTerms.controller");
const UploadValidId_controller_1 = require("./controllers/UploadValidId.controller");
const UploadProfilePicture_controller_1 = require("./controllers/UploadProfilePicture.controller");
const VerifyBankAccount_controller_1 = require("./controllers/VerifyBankAccount.controller");
const GetBankList_controller_1 = require("./controllers/GetBankList.controller");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/svg+xml",
            "application/pdf",
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type. Only JPEG, JPG, PNG, SVG, and PDF are allowed"));
        }
    },
});
// Onboarding routes
router.get("/status", GetOnboardingStatus_controller_1.getOnboardingStatus);
router.get("/banks", GetBankList_controller_1.getBankList);
router.post("/accept-terms", AcceptTerms_controller_1.acceptTerms);
router.post("/upload-valid-id", UploadValidId_controller_1.uploadValidId); // Accepts JSON with validIdUrl
router.post("/upload-profile-picture", UploadProfilePicture_controller_1.uploadProfilePicture); // Accepts JSON with profilePictureUrl
router.post("/verify-bank", VerifyBankAccount_controller_1.verifyBankAccount);
exports.default = router;
