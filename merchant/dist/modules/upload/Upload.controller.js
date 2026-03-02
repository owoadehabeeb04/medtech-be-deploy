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
exports.uploadBulk = exports.uploadSingle = void 0;
const http_status_1 = require("http-status");
const Upload_service_1 = require("./Upload.service");
const error_codes_1 = require("../../constants/error-codes");
const uploadSingle = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps } = req.context;
    if (!req.file) {
        return next(manageApplicationErrors({
            message: "No file uploaded",
            statusCode: http_status_1.BAD_REQUEST,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    const folder = req.body.folder || "general";
    const [error, data] = yield manageAsyncOps(Upload_service_1.UploadService.uploadSingle(req.file, folder));
    if (error) {
        console.log(error);
        return next(manageApplicationErrors({
            message: error.message || "Failed to upload file",
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    res.status(http_status_1.OK);
    res.response = {
        message: "File uploaded successfully",
        statusCode: http_status_1.OK,
        data,
    };
    return next();
});
exports.uploadSingle = uploadSingle;
const uploadBulk = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { manageApplicationErrors, manageAsyncOps } = req.context;
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return next(manageApplicationErrors({
            message: "No files uploaded",
            statusCode: http_status_1.BAD_REQUEST,
            errorCode: error_codes_1.ERROR_CODES.BAD_REQUEST,
        }));
    }
    const folder = req.body.folder || "general";
    const [error, data] = yield manageAsyncOps(Upload_service_1.UploadService.uploadBulk(req.files, folder));
    if (error) {
        console.log(error);
        return next(manageApplicationErrors({
            message: error.message || "Failed to upload files",
            statusCode: http_status_1.INTERNAL_SERVER_ERROR,
            errorCode: error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR,
        }));
    }
    res.status(http_status_1.OK);
    res.response = {
        message: `${req.files.length} file${req.files.length > 1 ? "s" : ""} uploaded successfully`,
        statusCode: http_status_1.OK,
        data,
    };
    return next();
});
exports.uploadBulk = uploadBulk;
