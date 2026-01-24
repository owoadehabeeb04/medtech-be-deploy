import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";
import { validateSchema } from "@medtech/utils";
import { updateCategorySchema } from "../Category.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id;
    const { categoryId } = req.params;

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    if (!categoryId || Array.isArray(categoryId)) {
      res.status(400);
      res.response = {
        message: "Invalid category ID",
        statusCode: 400,
      };
      return next();
    }

    const { error, value } = validateSchema(updateCategorySchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const category = await CategoryService.updateCategory(merchantId, categoryId, value);

    res.status(200);
    res.response = {
      message: "Category updated successfully",
      statusCode: 200,
      data: category,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
