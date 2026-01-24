import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status";
import { UploadService } from "./Upload.service";
import { ERROR_CODES as errorCode } from "../../constants/error-codes";

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
    console.log(error);
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
    console.log(error);
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
