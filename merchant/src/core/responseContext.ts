import { Request, Response, NextFunction } from "express";

const handleApplicationResponses = (req: Request, res: Response, next: NextFunction) => {
  // Check if response object is set and send it
  if (res.response) {
    const payload = {
      status: res.response.statusCode || res.statusCode,
      message: res.response.message || "Success",
      data: res.response.data ?? null,
    };
    
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(res.response.statusCode || res.statusCode).send(payload);
  }

  next();
};

export default handleApplicationResponses;
