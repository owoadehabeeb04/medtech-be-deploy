import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await SubscriptionService.getPlans();

    res.status(200);
    res.response = {
      message: "Plans retrieved successfully",
      statusCode: 200,
      data: plans,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
