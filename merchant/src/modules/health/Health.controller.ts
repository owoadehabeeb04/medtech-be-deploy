import { Request, Response, NextFunction } from "express";
import { OK, SERVICE_UNAVAILABLE } from "http-status";
import { HealthService } from "./Health.service";
import { RESPONSE_MESSAGES } from "../../constants/response";

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  const result = await HealthService.checkAll();
  
  res.status(result.code);
  res.response = {
    statusCode: result.code,
    message: result.message,
    data: result.data,
  };
  
  return next();
};
