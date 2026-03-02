import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { DiscountType, DiscountStatus } from "../../constants/enums";
export declare class Discount extends Model<Discount> {
    id: string;
    merchantId: string;
    merchant: Merchant;
    code: string;
    type: DiscountType;
    amount: number;
    applyToAllProducts: boolean;
    applicableProducts: string[] | null;
    applicableCategories: string[] | null;
    minOrderAmount: number | null;
    status: DiscountStatus;
    startDate: Date;
    endDate: Date;
    usageLimit: number | null;
    usageCount: number;
    perUserLimit: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    get isExpired(): boolean;
    get isValid(): boolean;
    get remainingUses(): number | null;
}
//# sourceMappingURL=Discount.model.d.ts.map