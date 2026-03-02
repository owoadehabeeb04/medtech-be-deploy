"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GetSettings_controller_1 = require("./controllers/GetSettings.controller");
const UpdateProfile_controller_1 = require("./controllers/UpdateProfile.controller");
const UpdatePayment_controller_1 = require("./controllers/UpdatePayment.controller");
const UpdateStore_controller_1 = require("./controllers/UpdateStore.controller");
const ChangePassword_controller_1 = require("./controllers/ChangePassword.controller");
const UpdateNotifications_controller_1 = require("./controllers/UpdateNotifications.controller");
const UpdatePreferences_controller_1 = require("./controllers/UpdatePreferences.controller");
const UpdateAllSettings_controller_1 = require("./controllers/UpdateAllSettings.controller");
const Auth_Middleware_1 = require("../../middlewares/Auth.Middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(Auth_Middleware_1.authMiddleware);
/**
 * @route GET /api/v1/merchant/settings
 * @description Get all merchant settings
 * @access Private
 */
router.get("/", GetSettings_controller_1.getAllSettings);
/**
 * @route PATCH /api/v1/merchant/settings/all
 * @description Update all merchant settings at once (unified endpoint)
 * @access Private
 */
router.patch("/all", UpdateAllSettings_controller_1.updateAllSettings);
/**
 * @route PATCH /api/v1/merchant/settings/profile
 * @description Update merchant profile (personal details)
 * @access Private
 */
router.patch("/profile", UpdateProfile_controller_1.updateProfile);
/**
 * @route PATCH /api/v1/merchant/settings/payment
 * @description Update payment details with Paystack verification
 * @access Private
 */
router.patch("/payment", UpdatePayment_controller_1.updatePayment);
/**
 * @route PATCH /api/v1/merchant/settings/store
 * @description Update store details (including banner URL from general upload)
 * @access Private
 */
router.patch("/store", UpdateStore_controller_1.updateStore);
/**
 * @route POST /api/v1/merchant/settings/password
 * @description Change merchant password
 * @access Private
 */
router.post("/password", ChangePassword_controller_1.changePassword);
/**
 * @route PATCH /api/v1/merchant/settings/notifications
 * @description Update notification settings (toggle-based, instant save)
 * @access Private
 */
router.patch("/notifications", UpdateNotifications_controller_1.updateNotifications);
/**
 * @route PATCH /api/v1/merchant/settings/preferences
 * @description Update store preferences (toggle-based with save button)
 * @access Private
 */
router.patch("/preferences", UpdatePreferences_controller_1.updatePreferences);
exports.default = router;
