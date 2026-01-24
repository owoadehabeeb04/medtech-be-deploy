import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";

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

    const { discountId } = req.params;

    if (!discountId || Array.isArray(discountId)) {
      res.status(400);
      res.response = {
        message: "Invalid discount ID",
        statusCode: 400,
      };
      return next();
    }

    const result = await DiscountService.deleteDiscount(merchantId, discountId);

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
