import { Router } from "express";
import multer from "multer";
import { getOnboardingStatus } from "./controllers/GetOnboardingStatus.controller";
import { uploadValidId } from "./controllers/UploadValidId.controller";
import { uploadProfilePicture } from "./controllers/UploadProfilePicture.controller";
import { verifyBankAccount } from "./controllers/VerifyBankAccount.controller";
import { getBankList } from "./controllers/GetBankList.controller";

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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
    } else {
      cb(new Error("Invalid file type. Only JPEG, JPG, PNG, SVG, and PDF are allowed"));
    }
  },
});

// Onboarding routes
router.get("/status", getOnboardingStatus);
router.get("/banks", getBankList);
router.post("/upload-valid-id", uploadValidId); // Accepts JSON with validIdUrl
router.post("/upload-profile-picture", uploadProfilePicture); // Accepts JSON with profilePictureUrl
router.post("/verify-bank", verifyBankAccount);

export default router;
