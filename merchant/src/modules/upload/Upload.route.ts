import express, { Router } from "express";
import multer from "multer";
import * as path from "path";
import { uploadSingle, uploadBulk } from "./Upload.controller";

const router: Router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // Max 10 files for bulk upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, JPG, PNG, PDF, SVG are allowed."));
    }
  },
});

// Single file upload
router.post("/single", upload.single("file"), uploadSingle);

// Multiple files upload
router.post("/bulk", upload.array("files", 10), uploadBulk);

export default router;
