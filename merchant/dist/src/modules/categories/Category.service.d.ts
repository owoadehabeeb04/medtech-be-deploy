import { Category } from "./Category.model";
import { CreateCategoryDTO, UpdateCategoryDTO } from "./Category.dto";
export declare class CategoryService {
    /**
     * Get all categories for a merchant
     */
    static getAllCategories(merchantId: string, includeInactive?: boolean): Promise<Category[]>;
    /**
     * Get a single category by ID
     */
    static getCategoryById(merchantId: string, categoryId: string): Promise<Category>;
    /**
     * Create a new category
     */
    static createCategory(merchantId: string, data: CreateCategoryDTO): Promise<Category>;
    /**
     * Update a category
     */
    static updateCategory(merchantId: string, categoryId: string, data: UpdateCategoryDTO): Promise<Category>;
    /**
     * Delete a category (soft delete)
     */
    static deleteCategory(merchantId: string, categoryId: string): Promise<{
        message: string;
    }>;
    /**
     * Restore a soft-deleted category
     */
    static restoreCategory(merchantId: string, categoryId: string): Promise<Category>;
    /**
     * Get category names as array (for product validation)
     */
    static getCategoryNames(merchantId: string): Promise<string[]>;
}
//# sourceMappingURL=Category.service.d.ts.map