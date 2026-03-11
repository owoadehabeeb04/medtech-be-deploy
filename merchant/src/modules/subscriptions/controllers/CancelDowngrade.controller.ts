import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../Subscription.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const result = await SubscriptionService.cancelDowngrade(String(user.id));

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
