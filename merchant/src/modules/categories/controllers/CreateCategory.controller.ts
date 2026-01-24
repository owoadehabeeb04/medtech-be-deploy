import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";
import { validateSchema } from "@medtech/utils";
import { createCategorySchema } from "../Category.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).merchant?.id;

    if (!merchantId) {
      res.status(401);
      res.response = {
        message: "Unauthorized",
        statusCode: 401,
      };
      return next();
    }

    const { error, value } = validateSchema(createCategorySchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const category = await CategoryService.createCategory(merchantId, value);

    res.status(201);
    res.response = {
      message: "Category created successfully",
      statusCode: 201,
      data: category,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
