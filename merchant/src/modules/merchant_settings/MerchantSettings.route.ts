import { Router } from "express";
import { ownerOnly, anyMember, requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import { getAllSettings } from "./controllers/GetSettings.controller";
import { updateProfile } from "./controllers/UpdateProfile.controller";
import { updatePayment } from "./controllers/UpdatePayment.controller";
import { updateStore } from "./controllers/UpdateStore.controller";
import { changePassword } from "./controllers/ChangePassword.controller";
import { updateNotifications } from "./controllers/UpdateNotifications.controller";
import { updatePreferences } from "./controllers/UpdatePreferences.controller";
import { updateAllSettings } from "./controllers/UpdateAllSettings.controller";
import { authMiddleware } from "../../middlewares/Auth.Middleware";
import { getStoreSettings } from "./controllers/GetStoreSettings.controller";
import { registerDeviceToken } from "./controllers/RegisterDeviceToken.controller";
import { removeDeviceToken } from "./controllers/RemoveDeviceToken.controller";
import { getPushNotificationStatus } from "./controllers/PushNotificationStatus.controller";
import { sendTestPushNotification } from "./controllers/TestPushNotification.controller";

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);


router.get("/", ownerOnly(), getAllSettings);
router.get("/store", requirePermission("store.view"), getStoreSettings);

router.post("/device-token", anyMember(), registerDeviceToken);
router.delete("/device-tokens/:deviceId", anyMember(), removeDeviceToken);
router.get("/notifications/push-status", ownerOnly(), getPushNotificationStatus);
router.post("/notifications/test", ownerOnly(), sendTestPushNotification);

/**
 * @route PATCH /api/v1/merchant/settings/all
 * @description Update all merchant settings at once (unified endpoint)
 * @access Private
 */
router.patch("/all", ownerOnly(), updateAllSettings);

/**
 * @route PATCH /api/v1/merchant/settings/profile
 * @description Update merchant profile (personal details)
 * @access Private
 */
router.patch("/profile", ownerOnly(), updateProfile);

/**
 * @route PATCH /api/v1/merchant/settings/payment
 * @description Update payment details with Paystack verification
 * @access Private
 */
router.patch("/payment", ownerOnly(), audit("settings.payment_updated"), updatePayment);

/**
 * @route PATCH /api/v1/merchant/settings/store
 * @description Update store details (including banner URL from general upload)
 * @access Private
 */
router.patch("/store", requirePermission("store.manage"), audit("settings.store_updated"), updateStore);

/**
 * @route POST /api/v1/merchant/settings/password
 * @description Change merchant password
 * @access Private
 */
router.post("/password", ownerOnly(), changePassword);

/**
 * @route PATCH /api/v1/merchant/settings/notifications
 * @description Update notification settings (toggle-based, instant save)
 * @access Private
 */
router.patch("/notifications", ownerOnly(), updateNotifications);

/**
 * @route PATCH /api/v1/merchant/settings/preferences
 * @description Update store preferences (toggle-based with save button)
 * @access Private
 */
router.patch("/preferences", requirePermission("store.manage"), audit("settings.preferences_updated"), updatePreferences);

export default router;
