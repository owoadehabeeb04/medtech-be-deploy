import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR } from "http-status";
import { PaystackService } from "../../../service/Paystack/Paystack.service";

export const getBankList = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps } = req.context;

  const [error, banks] = await manageAsyncOps(PaystackService.getBankList());

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message || "Failed to fetch bank list",
        statusCode: INTERNAL_SERVER_ERROR,
      })
    );
  }

  const responsePayload = {
    message: "Bank list retrieved successfully",
    statusCode: OK,
    data: banks,
  };

  return res.status(OK).json(responsePayload);
};
