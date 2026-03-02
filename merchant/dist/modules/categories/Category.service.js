"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const Category_model_1 = require("./Category.model");
const utils_1 = require("@medtech/utils");
const sequelize_1 = require("sequelize");
class CategoryService {
    /**
     * Get all categories for a merchant
     */
    static getAllCategories(merchantId_1) {
        return __awaiter(this, arguments, void 0, function* (merchantId, includeInactive = false) {
            const where = { merchantId };
            if (!includeInactive) {
                where.isActive = true;
            }
            const categories = yield Category_model_1.Category.findAll({
                where,
                order: [
                    ["isDefault", "DESC"], // Default categories first
                    ["name", "ASC"], // Then alphabetically
                ],
            });
            return categories;
        });
    }
    /**
     * Get a single category by ID
     */
    static getCategoryById(merchantId, categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const category = yield Category_model_1.Category.findOne({
                where: { id: categoryId, merchantId },
            });
            if (!category) {
                throw new utils_1.HttpException(404, "Category not found");
            }
            return category;
        });
    }
    /**
     * Create a new category
     */
    static createCategory(merchantId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Check if category with same name already exists for this merchant
            const existing = yield Category_model_1.Category.findOne({
                where: {
                    merchantId,
                    name: data.name.trim(),
                },
                paranoid: false, // Include soft-deleted
            });
            if (existing) {
                if (existing.deletedAt) {
                    // Restore and update
                    yield existing.restore();
                    yield existing.update({
                        name: data.name.trim(),
                        description: ((_a = data.description) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                        isActive: true,
                    });
                    return existing;
                }
                else {
                    throw new utils_1.HttpException(400, `Category "${data.name}" already exists`);
                }
            }
            const category = yield Category_model_1.Category.create({
                merchantId,
                name: data.name.trim(),
                description: ((_b = data.description) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                isDefault: false,
                isActive: true,
            });
            return category;
        });
    }
    /**
     * Update a category
     */
    static updateCategory(merchantId, categoryId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const category = yield this.getCategoryById(merchantId, categoryId);
            // Prevent updating default categories
            if (category.isDefault && data.name && data.name !== category.name) {
                throw new utils_1.HttpException(400, "Cannot rename default categories. You can only update their description or deactivate them.");
            }
            // If updating name, check for duplicates
            if (data.name && data.name.trim() !== category.name) {
                const existing = yield Category_model_1.Category.findOne({
                    where: {
                        merchantId,
                        name: data.name.trim(),
                        id: { [sequelize_1.Op.ne]: categoryId },
                    },
                });
                if (existing) {
                    throw new utils_1.HttpException(400, `Category "${data.name}" already exists`);
                }
            }
            // Update fields
            if (data.name !== undefined) {
                category.name = data.name.trim();
            }
            if (data.description !== undefined) {
                category.description = ((_a = data.description) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            }
            if (data.isActive !== undefined) {
                category.isActive = data.isActive;
            }
            yield category.save();
            return category;
        });
    }
    /**
     * Delete a category (soft delete)
     */
    static deleteCategory(merchantId, categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const category = yield this.getCategoryById(merchantId, categoryId);
            // Prevent deleting default categories
            if (category.isDefault) {
                throw new utils_1.HttpException(400, "Cannot delete default categories. You can only deactivate them.");
            }
            yield category.destroy();
            return { message: "Category deleted successfully" };
        });
    }
    /**
     * Restore a soft-deleted category
     */
    static restoreCategory(merchantId, categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const category = yield Category_model_1.Category.findOne({
                where: { id: categoryId, merchantId },
                paranoid: false, // Include soft-deleted
            });
            if (!category) {
                throw new utils_1.HttpException(404, "Category not found");
            }
            if (!category.deletedAt) {
                throw new utils_1.HttpException(400, "Category is not deleted");
            }
            yield category.restore();
            return category;
        });
    }
    /**
     * Get category names as array (for product validation)
     */
    static getCategoryNames(merchantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = yield Category_model_1.Category.findAll({
                where: { merchantId, isActive: true },
                attributes: ["name"],
            });
            return categories.map((cat) => cat.name);
        });
    }
}
exports.CategoryService = CategoryService;
