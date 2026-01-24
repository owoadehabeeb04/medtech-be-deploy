import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";

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

    const { discountId } = req.params;

    if (!discountId || Array.isArray(discountId)) {
      res.status(400);
      res.response = {
        message: "Invalid discount ID",
        statusCode: 400,
      };
      return next();
    }

    const discount = await DiscountService.restoreDiscount(merchantId, discountId);

    res.status(200);
    res.response = {
      message: "Discount restored successfully",
      statusCode: 200,
      data: discount,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
