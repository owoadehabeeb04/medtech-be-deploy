import { ProductStatus, DiscountType, DiscountStatus } from "../../constants/enums";

// Product DTOs
export interface ProductImageDTO {
  url: string;
  order: number;
  isMain: boolean;
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  category?: string;
  categoryId?: string;
  brand: string;
  sku?: string;
  barcode?: string | null;
  price: number;
  vat: number;
  discountPercentage?: number;
  minQuantity?: number;
  maxQuantity?: number;
  inventory: number;
  images: ProductImageDTO[];
  isActive?: boolean;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  brand?: string;
  sku?: string;
  barcode?: string | null;
  price?: number;
  vat?: number;
  discountPercentage?: number;
  minQuantity?: number;
  maxQuantity?: number;
  inventory?: number;
  images?: ProductImageDTO[];
  isActive?: boolean;
  status?: ProductStatus;
}

export interface UpdateProductStockDTO {
  inventory: number;
}
