import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { updateProductSchema } from "../Product.schema";
import { validateSchema } from "@medtech/utils";
import { CategoryService } from "../../categories/Category.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    const { productId } = req.params;
    
    if (!productId || Array.isArray(productId)) {
      res.status(400);
      res.response = {
        message: "Invalid product ID",
        statusCode: 400,
      };
      return next();
    }

    const { error, value } = validateSchema(updateProductSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    if (value.category) {
      const categoryNames = await CategoryService.getCategoryNames(merchantId);
      if (!categoryNames.includes(value.category.trim())) {
        res.status(400);
        res.response = {
          message: `Invalid category. Available categories: ${categoryNames.join(", ")}`,
          statusCode: 400,
        };
        return next();
      }
      value.category = value.category.trim();
    }

    const product = await ProductService.updateProduct(
      merchantId,
      productId,
      value
    );

    res.status(200);
    res.response = {
      message: "Product updated successfully",
      statusCode: 200,
      data: product,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
