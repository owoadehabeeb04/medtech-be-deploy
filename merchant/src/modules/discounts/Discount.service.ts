import { Discount } from "./Discount.model";
import { Product } from "../products/Product.model";
import { CreateDiscountDTO, UpdateDiscountDTO, ValidateDiscountDTO } from "./Discount.dto";
import { DiscountStatus, DiscountType } from "../../constants/enums";
import { Op } from "sequelize";
import { HttpException } from "@medtech/utils";

export class DiscountService {
  /**
   * Get all discounts for a merchant with pagination and filters
   */
  static async getAllDiscounts(
    merchantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: DiscountStatus;
      isExpired?: boolean;
    } = {}
  ) {
    const { page = 1, limit = 20, search, status, isExpired } = options;

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { merchantId };

    if (search) {
      where.code = { [Op.iLike]: `%${search}%` };
    }

    if (status) {
      where.status = status;
    }

    // Filter by expiration
    if (isExpired !== undefined) {
      const now = new Date();
      if (isExpired) {
        where[Op.or] = [
          { endDate: { [Op.lt]: now } },
          { startDate: { [Op.gt]: now } },
        ];
      } else {
        where.startDate = { [Op.lte]: now };
        where.endDate = { [Op.gte]: now };
      }
    }

    const { rows: discounts, count: total } = await Discount.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return {
      discounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single discount by ID
   */
  static async getDiscountById(merchantId: string, discountId: string) {
    const discount = await Discount.findOne({
      where: { id: discountId, merchantId },
    });

    if (!discount) {
      throw new HttpException(404, "Discount not found");
    }

    return discount;
  }

  /**
   * Get a discount by code
   */
  static async getDiscountByCode(merchantId: string, code: string) {
    const discount = await Discount.findOne({
      where: { merchantId, code: code.toUpperCase() },
    });

    if (!discount) {
      throw new HttpException(404, "Discount code not found");
    }

    return discount;
  }

  /**
   * Create a new discount
   */
  static async createDiscount(merchantId: string, data: CreateDiscountDTO) {
    // Check if code already exists for this merchant
    const existingDiscount = await Discount.findOne({
      where: {
        merchantId,
        code: data.code.toUpperCase(),
      },
      paranoid: false, // Check even soft-deleted ones
    });

    if (existingDiscount && !existingDiscount.deletedAt) {
      throw new HttpException(400, "Discount code already exists");
    }

    if (existingDiscount && existingDiscount.deletedAt) {
      throw new HttpException(
        400,
        "Discount code was previously used. Please choose a different code."
      );
    }

    // Validate dates
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new HttpException(400, "End date must be after start date");
    }

    // Validate percentage amount
    if (data.type === DiscountType.PERCENTAGE && data.amount > 100) {
      throw new HttpException(400, "Percentage discount cannot exceed 100");
    }

    // Ensure code is uppercase
    const discount = await Discount.create({
      ...data,
      merchantId,
      code: data.code.toUpperCase(),
    });

    return discount;
  }

  /**
   * Update an existing discount
   */
  static async updateDiscount(
    merchantId: string,
    discountId: string,
    data: UpdateDiscountDTO
  ) {
    const discount = await this.getDiscountById(merchantId, discountId);

    // If code is being changed, check uniqueness
    if (data.code && data.code !== discount.code) {
      const existingDiscount = await Discount.findOne({
        where: {
          merchantId,
          code: data.code.toUpperCase(),
          id: { [Op.ne]: discountId },
        },
      });

      if (existingDiscount) {
        throw new HttpException(400, "Discount code already exists");
      }

      data.code = data.code.toUpperCase();
    }

    // Validate dates if both are provided
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new HttpException(400, "End date must be after start date");
      }
    }

    // Validate percentage amount
    if (
      data.type === DiscountType.PERCENTAGE &&
      data.amount !== undefined &&
      data.amount > 100
    ) {
      throw new HttpException(400, "Percentage discount cannot exceed 100");
    }

    await discount.update(data);
    return discount;
  }

  /**
   * Soft delete a discount
   */
  static async deleteDiscount(merchantId: string, discountId: string) {
    const discount = await this.getDiscountById(merchantId, discountId);
    await discount.destroy(); // Soft delete (paranoid mode)
    return { message: "Discount deleted successfully" };
  }

  /**
   * Validate a discount code for use in an order
   * This endpoint will be called by the order service
   */
  static async validateDiscountCode(
    merchantId: string,
    data: ValidateDiscountDTO
  ) {
    const { code, orderAmount, productIds } = data;

    // Find the discount
    const discount = await this.getDiscountByCode(merchantId, code);

    // Check if discount is active
    if (discount.status !== DiscountStatus.ACTIVE) {
      throw new HttpException(400, "Discount code is inactive");
    }

    // Check date validity
    const now = new Date();
    if (now < discount.startDate) {
      throw new HttpException(400, "Discount code is not yet active");
    }
    if (now > discount.endDate) {
      throw new HttpException(400, "Discount code has expired");
    }

    // Check usage limit
    if (
      discount.usageLimit !== null &&
      discount.usageCount >= discount.usageLimit
    ) {
      throw new HttpException(400, "Discount code usage limit reached");
    }

    // Check minimum order amount
    if (discount.minOrderAmount && orderAmount < discount.minOrderAmount) {
      throw new HttpException(
        400,
        `Minimum order amount of ₦${discount.minOrderAmount} required`
      );
    }

    // Check product applicability
    if (!discount.applyToAllProducts) {
      let isApplicable = false;

      // Check if any products match
      if (discount.applicableProducts && discount.applicableProducts.length > 0) {
        const matchingProducts = productIds.filter((id) =>
          discount.applicableProducts!.includes(id)
        );
        if (matchingProducts.length > 0) {
          isApplicable = true;
        }
      }

      // Check if any product categories match
      if (
        !isApplicable &&
        discount.applicableCategories &&
        discount.applicableCategories.length > 0
      ) {
        const products = await Product.findAll({
          where: {
            merchantId,
            id: { [Op.in]: productIds },
          },
          attributes: ["category"],
        });

        const categories = products.map((p) => p.category);
        const matchingCategories = categories.filter((cat) =>
          discount.applicableCategories!.includes(cat)
        );

        if (matchingCategories.length > 0) {
          isApplicable = true;
        }
      }

      if (!isApplicable) {
        throw new HttpException(
          400,
          "Discount code is not applicable to items in your cart"
        );
      }
    }

    // Calculate discount amount
    let discountAmount: number;
    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (orderAmount * discount.amount) / 100;
    } else {
      discountAmount = discount.amount;
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);

    return {
      valid: true,
      discountId: discount.id,
      code: discount.code,
      type: discount.type,
      amount: discount.amount,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      message: "Discount code is valid",
    };
  }

  /**
   * Increment usage count for a discount
   * Called by order service after successful order
   */
  static async incrementUsageCount(merchantId: string, discountId: string) {
    const discount = await this.getDiscountById(merchantId, discountId);

    await discount.update({
      usageCount: discount.usageCount + 1,
    });

    return discount;
  }

  /**
   * Restore a soft-deleted discount
   */
  static async restoreDiscount(merchantId: string, discountId: string) {
    const discount = await Discount.findOne({
      where: { id: discountId, merchantId },
      paranoid: false, // Include soft-deleted records
    });

    if (!discount) {
      throw new HttpException(404, "Discount not found");
    }

    if (!discount.deletedAt) {
      throw new HttpException(400, "Discount is not deleted");
    }

    await discount.restore();
    return discount;
  }

  /**
   * Get discount statistics
   */
  static async getDiscountStats(merchantId: string) {
    const now = new Date();

    const [totalDiscounts, activeDiscounts, expiredDiscounts, usedCount] =
      await Promise.all([
        Discount.count({ where: { merchantId } }),
        Discount.count({
          where: {
            merchantId,
            status: DiscountStatus.ACTIVE,
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now },
          },
        }),
        Discount.count({
          where: {
            merchantId,
            endDate: { [Op.lt]: now },
          },
        }),
        Discount.sum("usageCount", { where: { merchantId } }),
      ]);

    return {
      totalDiscounts,
      activeDiscounts,
      expiredDiscounts,
      totalUsageCount: usedCount || 0,
    };
  }

  /**
   * Get active discounts (currently valid)
   */
  static async getActiveDiscounts(merchantId: string) {
    const now = new Date();

    const discounts = await Discount.findAll({
      where: {
        merchantId,
        status: DiscountStatus.ACTIVE,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
      },
      order: [["createdAt", "DESC"]],
    });

    return discounts;
  }
}
