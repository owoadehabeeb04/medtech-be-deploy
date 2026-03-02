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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const context_1 = require("./context");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("../middlewares/error.middleware");
const not_found_middleware_1 = require("../middlewares/not-found.middleware");
const config_1 = require("../config");
const responseContext_1 = __importDefault(require("./responseContext"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const timezone = config_1.applicationConfig.timezone;
process.env.TZ = timezone;
const { rateLimitOptions, serverPort } = config_1.applicationConfig;
let requestContext;
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const limiter = (0, express_rate_limit_1.default)({
    windowMs: rateLimitOptions.duration,
    max: rateLimitOptions.maxRequestsPerMinute,
    message: {
        status: 429,
        message: "Too many requests from this IP. Try again in a minute.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(express_1.default.static("asset"));
app.use(express_1.default.static("public"));
app.use((req, _, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.context = requestContext;
    return next();
}));
(0, routes_1.default)(app);
app.use(responseContext_1.default);
app.use(error_middleware_1.errorHandler);
app.use(not_found_middleware_1.notFoundHandler);
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    requestContext = yield (0, context_1.bootstrapRequestContext)();
    app.listen(serverPort, () => {
        console.log(` Merchant Backend Server started on port ${serverPort}`);
        console.log(` Environment: ${config_1.applicationConfig.nodeEnv}`);
    });
});
exports.startServer = startServer;
