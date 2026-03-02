"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("../config/swagger");
const config_1 = require("../config");
const Health_route_1 = __importDefault(require("../modules/health/Health.route"));
const MerchantAuth_route_1 = __importDefault(require("../modules/merchant_auth/MerchantAuth.route"));
const Upload_route_1 = __importDefault(require("../modules/upload/Upload.route"));
const MerchantOnboarding_route_1 = __importDefault(require("../modules/merchant_onboarding/MerchantOnboarding.route"));
const MerchantSettings_route_1 = __importDefault(require("../modules/merchant_settings/MerchantSettings.route"));
const Product_route_1 = __importDefault(require("../modules/products/Product.route"));
const Discount_route_1 = __importDefault(require("../modules/discounts/Discount.route"));
const Category_route_1 = __importDefault(require("../modules/categories/Category.route"));
const Support_route_1 = __importDefault(require("../modules/support/Support.route"));
const Auth_Middleware_1 = require("../middlewares/Auth.Middleware");
function default_1(app) {
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, helmet_1.default)());
    app.use((0, cookie_parser_1.default)());
    app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swagger_1.swaggerSpec);
    });
    const swaggerOptions = {
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
        },
    };
    app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, swaggerOptions));
    console.log(`Swagger UI available at http://localhost:${config_1.applicationConfig.serverPort}/api-docs`);
    console.log(`Swagger JSON available at http://localhost:${config_1.applicationConfig.serverPort}/api-docs.json`);
    const apiRouter = express_1.default.Router();
    apiRouter.use("/health", Health_route_1.default);
    apiRouter.use("/auth", MerchantAuth_route_1.default);
    apiRouter.use("/upload", Auth_Middleware_1.authMiddleware, Upload_route_1.default);
    apiRouter.use("/onboarding", Auth_Middleware_1.authMiddleware, MerchantOnboarding_route_1.default);
    apiRouter.use("/settings", MerchantSettings_route_1.default);
    apiRouter.use("/products", Auth_Middleware_1.authMiddleware, Product_route_1.default);
    apiRouter.use("/discounts", Auth_Middleware_1.authMiddleware, Discount_route_1.default);
    apiRouter.use("/categories", Auth_Middleware_1.authMiddleware, Category_route_1.default);
    apiRouter.use("/support", Auth_Middleware_1.authMiddleware, Support_route_1.default);
    app.use("/api/v1/merchant", apiRouter);
    console.log("✅ Routes registered:");
    console.log("   - /api/v1/merchant/health");
    console.log("   - /api/v1/merchant/auth/*");
    console.log("   - /api/v1/merchant/upload/* (protected)");
    console.log("   - /api/v1/merchant/onboarding/* (protected)");
    console.log("   - /api/v1/merchant/settings/* (protected)");
    console.log("   - /api/v1/merchant/products/* (protected)");
    console.log("   - /api/v1/merchant/discounts/* (protected)");
    console.log("   - /api/v1/merchant/categories/* (protected)");
    console.log("   - /api/v1/merchant/support/* (protected)");
}
