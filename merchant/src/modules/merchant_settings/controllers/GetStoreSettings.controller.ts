import { NextFunction, Request, Response } from "express";
import { HttpException } from "@medtech/utils";
import { MerchantSettingsService } from "../MerchantSettings.service";

/**
 * @swagger
 * /api/v1/merchant/settings/store:
 *   get:
 *     summary: "Get store settings"
 *     description: "Store details only (name, address with coordinates, hours, vacation, banner, description). Unlike GET /settings it never includes the owner's profile or bank details, so team members with store.view can read it."
 *     operationId: "merchant_get_api_v1_merchant_settings_store"
 *     tags: ["Merchant Settings"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Store settings"
 *       403:
 *         description: "Needs store.view"
 */
export const getStoreSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = String(req.context.user?.id || "").trim();
    if (!merchantId) throw new HttpException(401, "Authentication required");

    const result = await MerchantSettingsService.getStoreSettings(merchantId);
    if (!result.status) throw new HttpException(result.code, result.message);

    res.status(200);
    res.response = { statusCode: 200, message: result.message, data: result.data };
    return next();
  } catch (error) {
    return next(error);
  }
};
