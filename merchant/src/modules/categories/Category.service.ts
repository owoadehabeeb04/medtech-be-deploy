import { Category } from "./Category.model";
import { CreateCategoryDTO, UpdateCategoryDTO } from "./Category.dto";
import { HttpException } from "@medtech/utils";
import { Op } from "sequelize";

export class CategoryService {
  /**
   * Get all categories for a merchant
   */
  static async getAllCategories(merchantId: string, includeInactive: boolean = false) {
    const where: any = { merchantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await Category.findAll({
      where,
      order: [
        ["isDefault", "DESC"], // Default categories first
        ["name", "ASC"], // Then alphabetically
      ],
    });

    return categories;
  }

  /**
   * Get a single category by ID
   */
  static async getCategoryById(merchantId: string, categoryId: string) {
    const category = await Category.findOne({
      where: { id: categoryId, merchantId },
    });

    if (!category) {
      throw new HttpException(404, "Category not found");
    }

    return category;
  }

  /**
   * Create a new category
   */
  static async createCategory(merchantId: string, data: CreateCategoryDTO) {
    // Check if category with same name already exists for this merchant
    const existing = await Category.findOne({
      where: {
        merchantId,
        name: data.name.trim(),
      },
      paranoid: false, // Include soft-deleted
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore and update
        await existing.restore();
        await existing.update({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          isActive: true,
        });
        return existing;
      } else {
        throw new HttpException(400, `Category "${data.name}" already exists`);
      }
    }

    const category = await Category.create({
      merchantId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      isDefault: false,
      isActive: true,
    });

    return category;
  }

  /**
   * Update a category
   */
  static async updateCategory(
    merchantId: string,
    categoryId: string,
    data: UpdateCategoryDTO
  ) {
    const category = await this.getCategoryById(merchantId, categoryId);

    // Prevent updating default categories
    if (category.isDefault && data.name && data.name !== category.name) {
      throw new HttpException(
        400,
        "Cannot rename default categories. You can only update their description or deactivate them."
      );
    }

    // If updating name, check for duplicates
    if (data.name && data.name.trim() !== category.name) {
      const existing = await Category.findOne({
        where: {
          merchantId,
          name: data.name.trim(),
          id: { [Op.ne]: categoryId },
        },
      });

      if (existing) {
        throw new HttpException(400, `Category "${data.name}" already exists`);
      }
    }

    // Update fields
    if (data.name !== undefined) {
      category.name = data.name.trim();
    }
    if (data.description !== undefined) {
      category.description = data.description?.trim() || null;
    }
    if (data.isActive !== undefined) {
      category.isActive = data.isActive;
    }

    await category.save();

    return category;
  }

  /**
   * Delete a category (soft delete)
   */
  static async deleteCategory(merchantId: string, categoryId: string) {
    const category = await this.getCategoryById(merchantId, categoryId);

    // Prevent deleting default categories
    if (category.isDefault) {
      throw new HttpException(400, "Cannot delete default categories. You can only deactivate them.");
    }

    await category.destroy();

    return { message: "Category deleted successfully" };
  }

  /**
   * Restore a soft-deleted category
   */
  static async restoreCategory(merchantId: string, categoryId: string) {
    const category = await Category.findOne({
      where: { id: categoryId, merchantId },
      paranoid: false, // Include soft-deleted
    });

    if (!category) {
      throw new HttpException(404, "Category not found");
    }

    if (!category.deletedAt) {
      throw new HttpException(400, "Category is not deleted");
    }

    await category.restore();

    return category;
  }

  /**
   * Get category names as array (for product validation)
   */
  static async getCategoryNames(merchantId: string): Promise<string[]> {
    const categories = await Category.findAll({
      where: { merchantId, isActive: true },
      attributes: ["name"],
    });

    return categories.map((cat) => cat.name);
  }
}
