import { Discount } from "./Discount.model";
import { CreateDiscountDTO, UpdateDiscountDTO, ValidateDiscountDTO } from "./Discount.dto";
import { DiscountStatus, DiscountType } from "../../constants/enums";
export declare class DiscountService {
    /**
     * Get all discounts for a merchant with pagination and filters
     */
    static getAllDiscounts(merchantId: string, options?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: DiscountStatus;
        isExpired?: boolean;
    }): Promise<{
        discounts: Discount[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Get a single discount by ID
     */
    static getDiscountById(merchantId: string, discountId: string): Promise<Discount>;
    /**
     * Get a discount by code
     */
    static getDiscountByCode(merchantId: string, code: string): Promise<Discount>;
    /**
     * Create a new discount
     */
    static createDiscount(merchantId: string, data: CreateDiscountDTO): Promise<Discount>;
    /**
     * Update an existing discount
     */
    static updateDiscount(merchantId: string, discountId: string, data: UpdateDiscountDTO): Promise<Discount>;
    /**
     * Soft delete a discount
     */
    static deleteDiscount(merchantId: string, discountId: string): Promise<{
        message: string;
    }>;
    /**
     * Validate a discount code for use in an order
     * This endpoint will be called by the order service
     */
    static validateDiscountCode(merchantId: string, data: ValidateDiscountDTO): Promise<{
        valid: boolean;
        discountId: string;
        code: string;
        type: DiscountType;
        amount: number;
        discountAmount: number;
        message: string;
    }>;
    /**
     * Increment usage count for a discount
     * Called by order service after successful order
     */
    static incrementUsageCount(merchantId: string, discountId: string): Promise<Discount>;
    /**
     * Restore a soft-deleted discount
     */
    static restoreDiscount(merchantId: string, discountId: string): Promise<Discount>;
    /**
     * Get discount statistics
     */
    static getDiscountStats(merchantId: string): Promise<{
        totalDiscounts: number;
        activeDiscounts: number;
        expiredDiscounts: number;
        totalUsageCount: number;
    }>;
    /**
     * Get active discounts (currently valid)
     */
    static getActiveDiscounts(merchantId: string): Promise<Discount[]>;
}
//# sourceMappingURL=Discount.service.d.ts.map