import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../Discount.service";
import { createDiscountSchema } from "../Discount.schema";
import { validateSchema } from "@medtech/utils";


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

    const { error, value } = validateSchema(createDiscountSchema, req.body);
    if (error) {
      res.status(400);
      res.response = {
        message: error,
        statusCode: 400,
      };
      return next();
    }

    const discount = await DiscountService.createDiscount(merchantId, value);

    res.status(201);
    res.response = {
      message: "Discount created successfully",
      statusCode: 201,
      data: discount,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
