import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
import { ProductStatus } from "../../constants/enums";
interface ProductImage {
    url: string;
    order: number;
    isMain: boolean;
}
export declare class Product extends Model<Product> {
    id: string;
    merchantId: string;
    merchant: Merchant;
    name: string;
    description: string;
    category: string;
    brand: string;
    sku: string;
    price: number;
    vat: number;
    discountPercentage: number;
    minQuantity: number;
    maxQuantity: number;
    inventory: number;
    status: ProductStatus;
    images: ProductImage[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    get mainImage(): string | null;
    get discountedPrice(): number;
    get totalPrice(): number;
    get isLowStock(): boolean;
    get isOutOfStock(): boolean;
}
export {};
//# sourceMappingURL=Product.model.d.ts.map