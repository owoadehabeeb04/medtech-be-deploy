import { Request, Response, NextFunction } from "express";
import { WalletService } from "../Wallet.service";
import { validateSchema } from "@medtech/utils";
import { fundWalletSchema } from "../Wallet.schema";

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.context;

    if (!user?.id) {
      res.status(401);
      res.response = { message: "Authentication required", statusCode: 401 };
      return next();
    }

    const { error, value } = validateSchema(fundWalletSchema, req.body);
    if (error) {
      res.status(400);
      res.response = { message: error, statusCode: 400 };
      return next();
    }

    const result = await WalletService.fundWallet(String(user.id), value.amount);

    res.status(200);
    res.response = {
      message: "Wallet funding initiated successfully",
      statusCode: 200,
      data: result,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
