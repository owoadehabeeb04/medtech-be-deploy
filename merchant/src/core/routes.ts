import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import { applicationConfig } from "../config";

import healthRouter from "../modules/health/Health.route";
import merchantAuthRouter from "../modules/merchant_auth/MerchantAuth.route";
import uploadRouter from "../modules/upload/Upload.route";
import onboardingRouter from "../modules/merchant_onboarding/MerchantOnboarding.route";
import settingsRouter from "../modules/merchant_settings/MerchantSettings.route";
import productRouter from "../modules/products/Product.route";
import discountRouter from "../modules/discounts/Discount.route";
import categoryRouter from "../modules/categories/Category.route";
import supportRouter from "../modules/support/Support.route";
import { authMiddleware } from "../middlewares/Auth.Middleware";

export default function (app: Application) {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(helmet() as any);
  app.use(cookieParser() as any);

  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  };
  
  app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerSpec, swaggerOptions));

  console.log(`Swagger UI available at http://localhost:${applicationConfig.serverPort}/api-docs`);
  console.log(`Swagger JSON available at http://localhost:${applicationConfig.serverPort}/api-docs.json`);

  const apiRouter = express.Router();
  
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/auth", merchantAuthRouter);
  
  apiRouter.use("/upload", authMiddleware, uploadRouter);
  apiRouter.use("/onboarding", authMiddleware, onboardingRouter);
  apiRouter.use("/settings", settingsRouter);
  apiRouter.use("/products", authMiddleware, productRouter);
  apiRouter.use("/discounts", authMiddleware, discountRouter);
  apiRouter.use("/categories", authMiddleware, categoryRouter);
  apiRouter.use("/support", authMiddleware, supportRouter);

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
