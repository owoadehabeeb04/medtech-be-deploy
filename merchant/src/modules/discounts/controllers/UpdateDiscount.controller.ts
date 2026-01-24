import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";
import { updateDiscountSchema } from "../Discount.schema";
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

    const { discountId } = req.params;
    if (!discountId || Array.isArray(discountId)) {
      res.status(400);
      res.response = {
        message: "Invalid discount ID",
        statusCode: 400,
      };
      return next();
    }
    const { error, value } = validateSchema(updateDiscountSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const discount = await DiscountService.updateDiscount(
      merchantId,
      discountId,
      value
    );

    res.status(200);
    res.response = {
      message: "Discount updated successfully",
      statusCode: 200,
      data: discount,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
