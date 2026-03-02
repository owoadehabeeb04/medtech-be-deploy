"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const http_status_1 = require("http-status");
const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    const statusCode = err.statusCode || http_status_1.INTERNAL_SERVER_ERROR;
    const message = err.message || "Internal Server Error";
    const responsePayload = {
        status: statusCode,
        message,
        data: null,
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(statusCode).json(responsePayload);
};
exports.errorHandler = errorHandler;
