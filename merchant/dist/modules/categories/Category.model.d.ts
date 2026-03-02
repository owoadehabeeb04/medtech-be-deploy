import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
export declare class Category extends Model<Category> {
    id: string;
    merchantId: string;
    merchant: Merchant;
    name: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    /**
     * Seed default categories for a new merchant
     */
    static seedDefaultCategories(merchantId: string): Promise<void>;
}
//# sourceMappingURL=Category.model.d.ts.map