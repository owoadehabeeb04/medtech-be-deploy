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
import subscriptionRouter from "../modules/subscriptions/Subscription.route";
import walletRouter from "../modules/wallet/Wallet.route";
import { authMiddleware } from "../middlewares/Auth.Middleware";
import drugstoreInternalRouter from "../modules/drugstore_internal/DrugstoreInternal.route";
import { internalAuthMiddleware } from "../middlewares/internal-auth.middleware";
import drugstoreOrderRouter from "../modules/drugstore_orders/DrugstoreOrder.route";
import drugstorePrescriptionRouter from "../modules/drugstore_prescriptions/DrugstorePrescription.route";

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
	apiRouter.use("/subscriptions", subscriptionRouter);
	apiRouter.use("/wallet", authMiddleware, walletRouter);
	apiRouter.use("/drugstore-orders", authMiddleware, drugstoreOrderRouter);
	apiRouter.use("/drugstore-prescriptions", authMiddleware, drugstorePrescriptionRouter);
	apiRouter.use("/internal/drugstore", internalAuthMiddleware, drugstoreInternalRouter);

	app.use("/api/v1/merchant", apiRouter);
}
