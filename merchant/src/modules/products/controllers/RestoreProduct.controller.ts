import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";

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

    const product = await ProductService.restoreProduct(merchantId, productId);

    res.status(200);
    res.response = {
      message: "Product restored successfully",
      statusCode: 200,
      data: product,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
