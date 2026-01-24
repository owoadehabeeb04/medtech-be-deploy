import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";
import { updateStockSchema } from "../Product.schema";
import { validateSchema } from "@medtech/utils";

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
    const { error, value } = validateSchema(updateStockSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const product = await ProductService.updateStock(
      merchantId,
      productId,
      value
    );

    res.status(200);
    res.response = {
      message: "Product stock updated successfully",
      statusCode: 200,
      data: product,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
