import { Request, Response, NextFunction } from "express";
import { OK, SERVICE_UNAVAILABLE } from "http-status";
import { HealthService } from "./Health.service";

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
/**
 * @swagger
 * /api/v1/merchant/health:
 *   get:
 *     summary: "Health check"
 *     description: "Health check for the merchant API."
 *     operationId: "merchant_get_api_v1_merchant_health"
 *     tags: ["Health"]
 *     security: []
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication or signature rejected"
 */
