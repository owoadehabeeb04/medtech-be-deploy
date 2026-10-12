import express, { Router } from "express";
import multer from "multer";
import * as path from "path";
import { uploadSingle, uploadBulk, getUploadConfig } from "./Upload.controller";
import { applicationConfig } from "../../config";

const { upload: uploadConfig } = applicationConfig;

const router: Router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: uploadConfig.maxFileSizeBytes, // per file
    files: uploadConfig.maxFiles, // Max files for bulk upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error: any = new Error("Invalid file type. Only JPEG, JPG, PNG, PDF, SVG are allowed.");
      error.statusCode = 400;
      cb(error);
    }
  },
});

// Limits the clients should show to the user (e.g. next to the license upload field)
router.get("/config", getUploadConfig);

// Single file upload (cast for compatibility with express typings)
router.post("/single", upload.single("file") as any, uploadSingle);

// Multiple files upload
router.post("/bulk", upload.array("files", uploadConfig.maxFiles) as any, uploadBulk);

export default router;
