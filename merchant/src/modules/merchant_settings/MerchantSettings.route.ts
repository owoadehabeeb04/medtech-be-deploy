import { Router } from "express";
import { getAllSettings } from "./controllers/GetSettings.controller";
import { updateProfile } from "./controllers/UpdateProfile.controller";
import { updatePayment } from "./controllers/UpdatePayment.controller";
import { updateStore } from "./controllers/UpdateStore.controller";
import { changePassword } from "./controllers/ChangePassword.controller";
import { updateNotifications } from "./controllers/UpdateNotifications.controller";
import { updatePreferences } from "./controllers/UpdatePreferences.controller";
import { updateAllSettings } from "./controllers/UpdateAllSettings.controller";
import { authMiddleware } from "../../middlewares/Auth.Middleware";

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/v1/merchant/settings
 * @description Get all merchant settings
 * @access Private
 */
router.get("/", getAllSettings);

/**
 * @route PATCH /api/v1/merchant/settings/all
 * @description Update all merchant settings at once (unified endpoint)
 * @access Private
 */
router.patch("/all", updateAllSettings);

/**
 * @route PATCH /api/v1/merchant/settings/profile
 * @description Update merchant profile (personal details)
 * @access Private
 */
router.patch("/profile", updateProfile);

/**
 * @route PATCH /api/v1/merchant/settings/payment
 * @description Update payment details with Paystack verification
 * @access Private
 */
router.patch("/payment", updatePayment);

/**
 * @route PATCH /api/v1/merchant/settings/store
 * @description Update store details (including banner URL from general upload)
 * @access Private
 */
router.patch("/store", updateStore);

/**
 * @route POST /api/v1/merchant/settings/password
 * @description Change merchant password
 * @access Private
 */
router.post("/password", changePassword);

/**
 * @route PATCH /api/v1/merchant/settings/notifications
 * @description Update notification settings (toggle-based, instant save)
 * @access Private
 */
router.patch("/notifications", updateNotifications);

/**
 * @route PATCH /api/v1/merchant/settings/preferences
 * @description Update store preferences (toggle-based with save button)
 * @access Private
 */
router.patch("/preferences", updatePreferences);

export default router;
