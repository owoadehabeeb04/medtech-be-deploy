import { Request, Response, NextFunction } from "express";
import { INTERNAL_SERVER_ERROR } from "http-status";
import { applicationConfig } from "../config";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = (err as any).statusCode || INTERNAL_SERVER_ERROR;
  let message = err.message || "Internal Server Error";

  // Multer rejects an upload before any controller runs; give those clear, client-facing errors
  if (err.name === "MulterError") {
    const code = (err as any).code;
    if (code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = `File too large. Maximum size is ${applicationConfig.upload.maxFileSizeBytes / (1024 * 1024)}MB.`;
    } else if (code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE") {
      statusCode = 400;
      message = `Too many files. Maximum is ${applicationConfig.upload.maxFiles} files.`;
    } else {
      statusCode = 400;
    }
  }

  const responsePayload: {
    status: number;
    message: string;
    data: null;
  } = {
    status: statusCode,
    message,
    data: null,
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(responsePayload);
};
