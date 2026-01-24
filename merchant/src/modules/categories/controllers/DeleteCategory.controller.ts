import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../Category.service";

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

    const result = await CategoryService.deleteCategory(merchantId, categoryId);

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
