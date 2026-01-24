import { Request, Response, NextFunction } from "express";
import { ProductService } from "../Product.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = {
        message: "Authentication required",
        statusCode: 401,
      };
      return next();
    }

    const merchantId: string = String(user.id);
    const products = await ProductService.getLowStockProducts(merchantId);

    res.status(200);
    res.response = {
      message: "Low stock products retrieved successfully",
      statusCode: 200,
      data: products,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
