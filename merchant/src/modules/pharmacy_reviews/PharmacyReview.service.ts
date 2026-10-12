import { Op, QueryTypes } from "sequelize";
import { HttpException } from "@medtech/utils";
import { Merchant } from "../merchant/Merchant.model";
import { PharmacyReview } from "./PharmacyReview.model";

export interface CreateReviewInput {
  orderId: string;
  consumerId: string;
  consumerName: string;
  rating: number;
  comment?: string | null;
}

export interface RatingSummary {
  averageRating: number;
  reviewCount: number;
}

const EMPTY_SUMMARY: RatingSummary = { averageRating: 0, reviewCount: 0 };

const toPublicReview = (review: PharmacyReview) => ({
  id: review.id,
  consumerName: review.consumerName,
  rating: review.rating,
  comment: review.comment || "",
  reply: review.reply ? { message: review.reply, repliedAt: review.repliedAt } : null,
  createdAt: review.createdAt,
});

export class PharmacyReviewService {
  /** Average rating and count per merchant, for the nearby list and pharmacy profile. */
  static async getRatingSummaries(merchantIds: string[]): Promise<Map<string, RatingSummary>> {
    const summaries = new Map<string, RatingSummary>();
    if (merchantIds.length === 0) return summaries;

    const rows = await PharmacyReview.sequelize!.query<{ merchant_id: string; average: number; count: number }>(
      `SELECT merchant_id, AVG(rating)::float AS average, COUNT(*)::int AS count
       FROM pharmacy_reviews
       WHERE merchant_id IN (:merchantIds)
       GROUP BY merchant_id`,
      { replacements: { merchantIds }, type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      summaries.set(row.merchant_id, {
        averageRating: Math.round(row.average * 10) / 10,
        reviewCount: row.count,
      });
    }
    return summaries;
  }

  static async getRatingSummary(merchantId: string): Promise<RatingSummary> {
    return (await this.getRatingSummaries([merchantId])).get(merchantId) || EMPTY_SUMMARY;
  }

  static async createReview(merchantId: string, input: CreateReviewInput) {
    const merchant = await Merchant.findOne({ where: { id: merchantId, isActive: true } });
    if (!merchant) {
      throw new HttpException(404, "Pharmacy not found");
    }

    const existing = await PharmacyReview.findOne({ where: { orderId: input.orderId } });
    if (existing) {
      throw new HttpException(409, "This order has already been reviewed");
    }

    const review = await PharmacyReview.create({
      merchantId,
      orderId: input.orderId,
      consumerId: input.consumerId,
      consumerName: input.consumerName,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    });

    return toPublicReview(review);
  }

  /** What consumers see on a pharmacy's page. */
  static async listForPharmacy(merchantId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    const { rows, count } = await PharmacyReview.findAndCountAll({
      where: { merchantId },
      order: [["createdAt", "DESC"]],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });

    return {
      items: rows.map(toPublicReview),
      ratingSummary: await this.getRatingSummary(merchantId),
      pagination: {
        total: count,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      },
    };
  }

  /** The merchant's own Reviews page; `replied` filters answered / unanswered reviews. */
  static async listForMerchant(merchantId: string, options: { page?: number; limit?: number; replied?: boolean }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));

    const where: any = { merchantId };
    if (options.replied === true) where.reply = { [Op.ne]: null };
    if (options.replied === false) where.reply = null;

    const { rows, count } = await PharmacyReview.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      items: rows.map((review) => ({ ...toPublicReview(review), orderId: review.orderId })),
      ratingSummary: await this.getRatingSummary(merchantId),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async reply(merchantId: string, reviewId: string, message: string) {
    const review = await PharmacyReview.findOne({ where: { id: reviewId, merchantId } });
    if (!review) {
      throw new HttpException(404, "Review not found");
    }

    review.reply = message.trim();
    review.repliedAt = new Date();
    await review.save();

    return { ...toPublicReview(review), orderId: review.orderId };
  }
}
