import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";
import { validateSchema } from "@medtech/utils";
import { confirmPaymentSchema } from "../Subscription.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(confirmPaymentSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await SubscriptionService.confirmPayment(
      String(user.id),
      value.reference
    );

    res.status(200);
    res.response = {
      message: result.message,
      statusCode: 200,
      data: result.subscription,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
