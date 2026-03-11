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

    const wallet = await WalletService.getWallet(String(user.id));

    res.status(200);
    res.response = {
      message: "Wallet retrieved successfully",
      statusCode: 200,
      data: wallet,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
