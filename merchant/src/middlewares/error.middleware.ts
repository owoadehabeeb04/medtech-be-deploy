import { Request, Response, NextFunction } from "express";
import { INTERNAL_SERVER_ERROR } from "http-status";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  const statusCode = (err as any).statusCode || INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal Server Error";

  const responsePayload: {
    status: number;
    message: string;
    data: null;
  } = {
    status: statusCode,
    message,
    data: null,
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(responsePayload);
};
