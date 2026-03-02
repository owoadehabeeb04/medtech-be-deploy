"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const http_status_1 = require("http-status");
const notFoundHandler = (req, res, next) => {
    res.status(http_status_1.NOT_FOUND);
    res.response = {
        statusCode: http_status_1.NOT_FOUND,
        message: "Route not found",
        data: null,
    };
    // Trigger the unified response handler instead of falling through to
    // Express' default HTML error page
    return res.send();
};
exports.notFoundHandler = notFoundHandler;
