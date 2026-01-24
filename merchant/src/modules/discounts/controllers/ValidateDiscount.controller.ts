import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";
import { validateDiscountSchema } from "../Discount.schema";
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

    const { error, value } = validateSchema(validateDiscountSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const result = await DiscountService.validateDiscountCode(
      merchantId,
      value
    );

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: result,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
