import { NextFunction, Request, Response } from "express";
import { HttpException } from "@medtech/utils";
import { DrugstorePrescriptionService } from "./DrugstorePrescription.service";

const getMerchantId = (req: Request): string => {
  const merchantId = String(req.context.user?.id || "").trim();
  if (!merchantId) {
    throw new HttpException(401, "Authentication required");
  }
  return merchantId;
};

export const listDrugstorePrescriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const data = await DrugstorePrescriptionService.listForMerchant(
      merchantId,
      req.query.status ? String(req.query.status) : undefined
    );

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore prescriptions retrieved successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
/**
 * @swagger
 * /api/v1/merchant/drugstore-prescriptions:
 *   get:
 *     summary: "List drugstore prescriptions"
 *     description: "List drugstore prescriptions for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_drugstore_prescriptions"
 *     tags: ["Drugstore Prescriptions"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ListDrugstorePrescriptionsResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */

/**
 * @swagger
 * /api/v1/merchant/drugstore-prescriptions/{prescriptionId}/review:
 *   post:
 *     summary: "Review drugstore prescription"
 *     description: "Review drugstore prescription for the merchant API."
 *     operationId: "merchant_post_api_v1_merchant_drugstore_prescriptions_prescriptionId_review"
 *     tags: ["Drugstore Prescriptions"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: prescriptionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ReviewDrugstorePrescriptionRequest"
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReviewDrugstorePrescriptionResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 *       404:
 *         description: "Requested resource was not found"
 *       409:
 *         description: "Business rule conflict"
 */

export const reviewDrugstorePrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const prescriptionId = String(req.params.prescriptionId || "").trim();
    if (!prescriptionId) {
      throw new HttpException(400, "prescriptionId param is required");
    }

    const action = String(req.body?.action || "").trim() as "approved" | "rejected" | "needs_clarification";
    if (!["approved", "rejected", "needs_clarification"].includes(action)) {
      throw new HttpException(400, "Valid action is required");
    }

    const data = await DrugstorePrescriptionService.reviewForMerchant(merchantId, prescriptionId, {
      action,
      note: req.body?.note ? String(req.body.note) : undefined,
      reviewerId: merchantId,
      reviewerName: String(req.context.user?.name || "").trim() || undefined,
    });

    res.status(200);
    res.response = {
      statusCode: 200,
      message: "Drugstore prescription reviewed successfully",
      data,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
