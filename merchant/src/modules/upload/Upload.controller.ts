import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { UploadService } from "./Upload.service";
import { ERROR_CODES as errorCode } from "../../constants/error-codes";
import { applicationConfig } from "../../config";

export const uploadSingle = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps } = req.context;

  if (!req.file) {
    return next(
      manageApplicationErrors({
        message: "No file uploaded",
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const folder = req.body.folder || "general";

  const [error, data] = await manageAsyncOps(UploadService.uploadSingle(req.file, folder));

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message || "Failed to upload file",
        statusCode: INTERNAL_SERVER_ERROR,
        errorCode: errorCode.INTERNAL_SERVER_ERROR,
      })
    );
  }

  res.status(OK);
  res.response = {
    message: "File uploaded successfully",
    statusCode: OK,
    data,
  };

  return next();
};
/**
 * @swagger
 * /api/v1/merchant/upload/single:
 *   post:
 *     summary: "Upload single"
 *     description: "Uploads one file (JPEG, JPG, PNG, PDF or SVG). The maximum size and allowed types are available from GET /upload/config. Returns 413 if the file is too large and 400 for an unsupported type."
 *     operationId: "merchant_post_api_v1_merchant_upload_single"
 *     tags: ["Upload"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/UploadSingleRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UploadSingleResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       413:
 *         description: "File too large. The limit is returned by GET /upload/config (10MB by default)"
 *       409:
 *         description: "Business rule conflict"
 */

/**
 * @swagger
 * /api/v1/merchant/upload/bulk:
 *   post:
 *     summary: "Upload bulk"
 *     description: "Uploads several files in one request (up to the maxFiles value from GET /upload/config). Each file is subject to the same size and type limits as the single upload."
 *     operationId: "merchant_post_api_v1_merchant_upload_bulk"
 *     tags: ["Upload"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/UploadBulkRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UploadBulkResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       413:
 *         description: "File too large. The limit is returned by GET /upload/config (10MB by default)"
 *       409:
 *         description: "Business rule conflict"
 */

export const uploadBulk = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps } = req.context;

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return next(
      manageApplicationErrors({
        message: "No files uploaded",
        statusCode: BAD_REQUEST,
        errorCode: errorCode.BAD_REQUEST,
      })
    );
  }

  const folder = req.body.folder || "general";

  const [error, data] = await manageAsyncOps(UploadService.uploadBulk(req.files, folder));

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message || "Failed to upload files",
        statusCode: INTERNAL_SERVER_ERROR,
        errorCode: errorCode.INTERNAL_SERVER_ERROR,
      })
    );
  }

  res.status(OK);
  res.response = {
    message: `${req.files.length} file${req.files.length > 1 ? "s" : ""} uploaded successfully`,
    statusCode: OK,
    data,
  };

  return next();
};

/**
 * @swagger
 * /api/v1/merchant/upload/config:
 *   get:
 *     summary: "Get upload limits"
 *     description: "Returns the maximum file size, allowed file types and maximum file count so clients can show them next to upload fields."
 *     operationId: "merchant_get_api_v1_merchant_upload_config"
 *     tags: ["Upload"]
 *     responses:
 *       200:
 *         description: "Upload limits"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UploadConfigResponse"
 */
export const getUploadConfig = (_req: Request, res: Response, next: NextFunction) => {
  const { maxFileSizeBytes, maxFiles, allowedExtensions } = applicationConfig.upload;

  res.status(OK);
  res.response = {
    message: "Upload limits retrieved successfully",
    statusCode: OK,
    data: {
      maxFileSizeBytes,
      maxFileSizeMb: maxFileSizeBytes / (1024 * 1024),
      maxFiles,
      allowedExtensions,
    },
  };

  return next();
};
