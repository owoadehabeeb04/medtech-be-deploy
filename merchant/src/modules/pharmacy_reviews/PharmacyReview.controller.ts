import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { HttpException } from "@medtech/utils";
import { PharmacyReviewService } from "./PharmacyReview.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const replySchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Reply cannot be empty",
    "any.required": "Reply message is required",
  }),
});

const getMerchantId = (req: Request): string => {
  const id = req.context.user?.id;
  if (!id) throw new HttpException(401, "Authentication required");
  return String(id);
};

/**
 * @swagger
 * /api/v1/merchant/reviews:
 *   get:
 *     summary: "List my pharmacy reviews"
 *     description: "Customer reviews of the signed-in merchant's pharmacy, newest first, with the average rating. Use replied=false to see reviews still waiting for a reply."
 *     operationId: "merchant_get_api_v1_merchant_reviews"
 *     tags: ["Reviews"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: replied, schema: { type: boolean }, description: "true = answered only, false = unanswered only" }
 *     responses:
 *       200:
 *         description: "Reviews retrieved"
 *       401:
 *         description: "Authentication required"
 */
export const listMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const replied = req.query.replied === undefined ? undefined : String(req.query.replied) === "true";

    const data = await PharmacyReviewService.listForMerchant(merchantId, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      replied,
    });

    res.status(200);
    res.response = { statusCode: 200, message: "Reviews retrieved successfully", data };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * @swagger
 * /api/v1/merchant/reviews/{reviewId}/reply:
 *   post:
 *     summary: "Reply to a review"
 *     description: "Adds the merchant's public reply under a customer review. Posting again replaces the earlier reply."
 *     operationId: "merchant_post_api_v1_merchant_reviews_reply"
 *     tags: ["Reviews"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: reviewId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: "Reply saved; the updated review is returned with reply.message and reply.repliedAt"
 *       400:
 *         description: "Invalid reply"
 *       404:
 *         description: "Review not found"
 */
export const replyToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = getMerchantId(req);
    const reviewId = String(req.params.reviewId || "");
    if (!UUID_PATTERN.test(reviewId)) {
      throw new HttpException(404, "Review not found");
    }

    const { error, value } = replySchema.validate(req.body || {});
    if (error) {
      throw new HttpException(400, error.details[0].message);
    }

    const data = await PharmacyReviewService.reply(merchantId, reviewId, value.message);

    res.status(200);
    res.response = { statusCode: 200, message: "Reply posted successfully", data };
    return next();
  } catch (error) {
    return next(error);
  }
};
