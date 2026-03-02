import { Product } from "./Product.model";
import { CreateProductDTO, UpdateProductDTO, UpdateProductStockDTO } from "./Product.dto";
import { ProductStatus } from "../../constants/enums";
export declare class ProductService {
    /**
     * Get all products for a merchant with pagination and filters
     */
    static getAllProducts(merchantId: string, options?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        status?: ProductStatus;
        isActive?: boolean;
    }): Promise<{
        products: Product[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Get a single product by ID
     */
    static getProductById(merchantId: string, productId: string): Promise<Product>;
    /**
     * Create a new product
     */
    static createProduct(merchantId: string, data: CreateProductDTO): Promise<Product>;
    /**
     * Update an existing product
     */
    static updateProduct(merchantId: string, productId: string, data: UpdateProductDTO): Promise<Product>;
    /**
     * Soft delete a product
     */
    static deleteProduct(merchantId: string, productId: string): Promise<{
        message: string;
    }>;
    /**
     * Update product stock/inventory
     */
    static updateStock(merchantId: string, productId: string, data: UpdateProductStockDTO): Promise<Product>;
    /**
     * Get low stock products for a merchant
     */
    static getLowStockProducts(merchantId: string): Promise<Product[]>;
    /**
     * Get out of stock products
     */
    static getOutOfStockProducts(merchantId: string): Promise<Product[]>;
    /**
     * Restore a soft-deleted product
     */
    static restoreProduct(merchantId: string, productId: string): Promise<Product>;
    /**
     * Increment stock (e.g., when restocking)
     */
    static incrementStock(merchantId: string, productId: string, quantity: number): Promise<Product>;
    /**
     * Decrement stock (e.g., after an order)
     * Note: This is for manual adjustments. Order service handles order-based decrements.
     */
    static decrementStock(merchantId: string, productId: string, quantity: number): Promise<Product>;
    /**
     * Get product statistics for dashboard
     */
    static getProductStats(merchantId: string): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStockCount: number;
        outOfStockCount: number;
        inStockCount: number;
    }>;
}
//# sourceMappingURL=Product.service.d.ts.map