import { Request, Response, NextFunction } from "express";
import { SupportService } from "../Support.service";
import { validateSchema } from "@medtech/utils";
import { contactSupportSchema } from "../Support.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id;
    const merchant = (req as any).merchant;

    if (!merchantId || !merchant) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    const { error, value } = validateSchema(contactSupportSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const merchantEmail = value.email;
    const merchantName = value.name;

    const result = await SupportService.contactSupport(
      merchantId,
      merchantEmail,
      merchantName,
      value
    );
console.log("Contact Support Result:", result);
    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: {
        success: result.success,
      },
    };
    return next();
  } catch (error: any) {
    console.error("Error in contactSupport controller:", error);
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/support/contact:
 *   post:
 *     summary: "Contact support"
 *     description: "Contact support for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_support_contact"
 *     tags: ["Support"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       409:
 *         description: "Business rule conflict"
 */
