import { DiscountType, DiscountStatus } from "../../constants/enums";

export interface CreateDiscountDTO {
  code: string;
  type: DiscountType;
  amount: number;
  applyToAllProducts?: boolean;
  applicableProducts?: string[]; // Array of product IDs
  applicableCategories?: string[]; // Array of category names
  applicableCategoryIds?: string[]; // Array of global product category IDs
  minOrderAmount?: number;
  status: DiscountStatus;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  perUserLimit?: number;
}

export interface UpdateDiscountDTO {
  code?: string;
  type?: DiscountType;
  amount?: number;
  applyToAllProducts?: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableCategoryIds?: string[];
  minOrderAmount?: number;
  status?: DiscountStatus;
  startDate?: Date;
  endDate?: Date;
  usageLimit?: number;
  perUserLimit?: number;
}

export interface ValidateDiscountDTO {
  code: string;
  orderAmount: number;
  productIds: string[];
}
