import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { page, limit, type, status } = req.query;

    const result = await WalletService.getTransactions(String(user.id), {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      type: type as string | undefined,
      status: status as string | undefined,
    });

    res.status(200);
    res.response = {
      message: "Transactions retrieved successfully",
      statusCode: 200,
      data: result,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
