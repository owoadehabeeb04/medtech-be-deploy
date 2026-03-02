"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handleApplicationResponses = (req, res, next) => {
    var _a;
    // Check if response object is set and send it
    if (res.response) {
        const payload = {
            status: res.response.statusCode || res.statusCode,
            message: res.response.message || "Success",
            data: (_a = res.response.data) !== null && _a !== void 0 ? _a : null,
        };
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(res.response.statusCode || res.statusCode).send(payload);
    }
    next();
};
exports.default = handleApplicationResponses;
