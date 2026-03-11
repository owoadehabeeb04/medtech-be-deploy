import { Product } from "./Product.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Subscription } from "../subscriptions/Subscription.model";
import { Plan } from "../subscriptions/Plan.model";
import { CreateProductDTO, UpdateProductDTO, UpdateProductStockDTO } from "./Product.dto";
import { ProductStatus } from "../../constants/enums";
import { Op } from "sequelize";
import { HttpException } from "@medtech/utils";

export class ProductService {
  /**
   * Get all products for a merchant with pagination and filters
   */
  static async getAllProducts(
    merchantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      status?: ProductStatus;
      isActive?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      isActive,
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { merchantId };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single product by ID
   */
  static async getProductById(merchantId: string, productId: string) {
    const product = await Product.findOne({
      where: { id: productId, merchantId },
    });

    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    return product;
  }

  /**
   * Create a new product
   */
  static async createProduct(merchantId: string, data: CreateProductDTO) {
    // Enforce plan product listing limits
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });

    if (subscription?.plan?.maxProductListings !== null && subscription?.plan?.maxProductListings !== undefined) {
      const currentCount = await Product.count({ where: { merchantId, isActive: true } });
      if (currentCount >= subscription.plan.maxProductListings) {
        throw new HttpException(
          403,
          `Your ${subscription.plan.displayName} plan allows a maximum of ${subscription.plan.maxProductListings} product listings. Please upgrade your plan to add more products.`
        );
      }
    }

    // Get merchant settings to determine low stock threshold
    const settings = await MerchantSettings.findOne({ where: { merchantId } });
    const lowStockThreshold = settings?.storePreferences?.lowStockThreshold || 10;

    // Calculate initial status based on inventory
    let status: ProductStatus;
    if (data.inventory === 0) {
      status = ProductStatus.OUT_OF_STOCK;
    } else if (data.inventory <= lowStockThreshold) {
      status = ProductStatus.LOW_STOCK;
    } else {
      status = ProductStatus.IN_STOCK;
    }

    // Ensure first image is marked as main
    if (data.images && data.images.length > 0) {
      data.images[0].isMain = true;
      // Ensure only first image is main
      for (let i = 1; i < data.images.length; i++) {
        data.images[i].isMain = false;
      }
    }

    const product = await Product.create({
      ...data,
      merchantId,
      status,
    });

    return product;
  }

  /**
   * Update an existing product
   */
  static async updateProduct(
    merchantId: string,
    productId: string ,
    data: UpdateProductDTO
  ) {
    const product = await this.getProductById(merchantId, productId);

    // If images are being updated, ensure first is marked as main
    if (data.images && data.images.length > 0) {
      data.images[0].isMain = true;
      for (let i = 1; i < data.images.length; i++) {
        data.images[i].isMain = false;
      }
    }

    // If inventory is being updated, recalculate status
    if (data.inventory !== undefined) {
      const settings = await MerchantSettings.findOne({ where: { merchantId } });
      const lowStockThreshold = settings?.storePreferences?.lowStockThreshold || 10;

      if (data.inventory === 0) {
        data.status = ProductStatus.OUT_OF_STOCK;
      } else if (data.inventory <= lowStockThreshold) {
        data.status = ProductStatus.LOW_STOCK;
      } else {
        data.status = ProductStatus.IN_STOCK;
      }
    }

    await product.update(data);
    return product;
  }

  /**
   * Soft delete a product
   */
  static async deleteProduct(merchantId: string, productId: string) {
    const product = await this.getProductById(merchantId, productId);
    await product.destroy(); // Soft delete (paranoid mode)
    return { message: "Product deleted successfully" };
  }

  /**
   * Update product stock/inventory
   */
  static async updateStock(
    merchantId: string,
    productId: string,
    data: UpdateProductStockDTO
  ) {
    const product = await this.getProductById(merchantId, productId);

    // Get merchant settings for low stock threshold
    const settings = await MerchantSettings.findOne({ where: { merchantId } });
    const lowStockThreshold = settings?.storePreferences?.lowStockThreshold || 10;

    // Calculate new status
    let status: ProductStatus;
    if (data.inventory === 0) {
      status = ProductStatus.OUT_OF_STOCK;
    } else if (data.inventory <= lowStockThreshold) {
      status = ProductStatus.LOW_STOCK;
    } else {
      status = ProductStatus.IN_STOCK;
    }

    await product.update({
      inventory: data.inventory,
      status,
    });

    return product;
  }

  /**
   * Get low stock products for a merchant
   */
  static async getLowStockProducts(merchantId: string) {
    const settings = await MerchantSettings.findOne({ where: { merchantId } });
    const lowStockThreshold = settings?.storePreferences?.lowStockThreshold || 10;

    const products = await Product.findAll({
      where: {
        merchantId,
        inventory: {
          [Op.lte]: lowStockThreshold,
          [Op.gt]: 0,
        },
        status: ProductStatus.LOW_STOCK,
        isActive: true,
      },
      order: [["inventory", "ASC"]],
    });

    return products;
  }

  /**
   * Get out of stock products
   */
  static async getOutOfStockProducts(merchantId: string) {
    const products = await Product.findAll({
      where: {
        merchantId,
        inventory: 0,
        status: ProductStatus.OUT_OF_STOCK,
      },
      order: [["updatedAt", "DESC"]],
    });

    return products;
  }

  /**
   * Restore a soft-deleted product
   */
  static async restoreProduct(merchantId: string, productId: string) {
    const product = await Product.findOne({
      where: { id: productId, merchantId },
      paranoid: false, // Include soft-deleted records
    });

    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    if (!product.deletedAt) {
      throw new HttpException(400, "Product is not deleted");
    }

    await product.restore();
    return product;
  }

  /**
   * Increment stock (e.g., when restocking)
   */
  static async incrementStock(
    merchantId: string,
    productId: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      throw new HttpException(400, "Quantity must be positive");
    }

    const product = await this.getProductById(merchantId, productId);
    const newInventory = product.inventory + quantity;

    return await this.updateStock(merchantId, productId, {
      inventory: newInventory,
    });
  }

  /**
   * Decrement stock (e.g., after an order)
   * Note: This is for manual adjustments. Order service handles order-based decrements.
   */
  static async decrementStock(
    merchantId: string,
    productId: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      throw new HttpException(400, "Quantity must be positive");
    }

    const product = await this.getProductById(merchantId, productId);
    const newInventory = Math.max(0, product.inventory - quantity);

    return await this.updateStock(merchantId, productId, {
      inventory: newInventory,
    });
  }

  /**
   * Get product statistics for dashboard
   */
  static async getProductStats(merchantId: string) {
    const [totalProducts, activeProducts, lowStockCount, outOfStockCount] =
      await Promise.all([
        Product.count({ where: { merchantId } }),
        Product.count({ where: { merchantId, isActive: true } }),
        Product.count({
          where: { merchantId, status: ProductStatus.LOW_STOCK },
        }),
        Product.count({
          where: { merchantId, status: ProductStatus.OUT_OF_STOCK },
        }),
      ]);

    return {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      inStockCount: activeProducts - lowStockCount - outOfStockCount,
    };
  }
}
