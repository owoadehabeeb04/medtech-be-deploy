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

    const stats = await ProductService.getProductStats(merchantId);

    res.status(200);
    res.response = {
      message: "Product statistics retrieved successfully",
      statusCode: 200,
      data: stats,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
