import { Request, Response, NextFunction } from "express";
import { NOT_FOUND } from "http-status";

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(NOT_FOUND);
  res.response = {
    statusCode: NOT_FOUND,
    message: "Route not found",
    data: null,
  };

  // Trigger the unified response handler instead of falling through to
  // Express' default HTML error page
  return res.send();
};
