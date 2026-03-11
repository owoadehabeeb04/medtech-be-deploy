import { Router } from "express";
import GetPlansController from "./controllers/GetPlans.controller";
import GetSubscriptionController from "./controllers/GetSubscription.controller";
import SubscribeController from "./controllers/Subscribe.controller";
import ConfirmPaymentController from "./controllers/ConfirmPayment.controller";
import UpgradePlanController from "./controllers/UpgradePlan.controller";
import DowngradePlanController from "./controllers/DowngradePlan.controller";
import CancelDowngradeController from "./controllers/CancelDowngrade.controller";
import CancelSubscriptionController from "./controllers/CancelSubscription.controller";
import ToggleAutoRenewController from "./controllers/ToggleAutoRenew.controller";
import WebhookController from "./controllers/Webhook.controller";
import { authMiddleware } from "../../middlewares/Auth.Middleware";

const subscriptionRouter: Router = Router();

// Public routes
subscriptionRouter.get("/plans", GetPlansController);
subscriptionRouter.post("/webhook", WebhookController);

// Authenticated routes
subscriptionRouter.get("/", authMiddleware, GetSubscriptionController);
subscriptionRouter.post("/subscribe", authMiddleware, SubscribeController);
subscriptionRouter.post("/confirm-payment", authMiddleware, ConfirmPaymentController);
subscriptionRouter.post("/upgrade", authMiddleware, UpgradePlanController);
subscriptionRouter.post("/downgrade", authMiddleware, DowngradePlanController);
subscriptionRouter.post("/cancel-downgrade", authMiddleware, CancelDowngradeController);
subscriptionRouter.post("/cancel", authMiddleware, CancelSubscriptionController);
subscriptionRouter.patch("/auto-renew", authMiddleware, ToggleAutoRenewController);

export default subscriptionRouter;
