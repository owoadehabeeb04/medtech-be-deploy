import { Request, Response, NextFunction } from "express";
import { MerchantSettingsService } from "../MerchantSettings.service";

export const getAllSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { manageApplicationErrors, manageAsyncOps, user } = req.context;

  if (!user?.id) {
    return next(
      manageApplicationErrors({
        message: "Authentication required",
        statusCode: 401,
      })
    );
  }

  const merchantId: string = String(user.id);

  const [error, result] = await manageAsyncOps(
    MerchantSettingsService.getAllSettings(merchantId)
  );

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message,
        statusCode: 500,
      })
    );
  }

  return res.status(result.code).json({
    message: result.message,
    statusCode: result.code,
    data: result.data,
  });
};
