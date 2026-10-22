import { NextFunction, Request, Response } from "express";
import { OK, INTERNAL_SERVER_ERROR } from "http-status";
import { BankVerificationService, BankVerificationError } from "../../../service/Payments/BankVerification.service";

export const getBankList = async (req: Request, res: Response, next: NextFunction) => {
  const { manageApplicationErrors, manageAsyncOps } = req.context;

  const [error, banks] = await manageAsyncOps(BankVerificationService.listBanks());

  if (error) {
    return next(
      manageApplicationErrors({
        message: error.message || "Failed to fetch bank list",
        statusCode: error instanceof BankVerificationError ? error.statusCode : INTERNAL_SERVER_ERROR,
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
/**
 * @swagger
 * /api/v1/merchant/onboarding/banks:
 *   get:
 *     summary: "Get bank list"
 *     description: "Banks a merchant can choose for payouts. `code` is an opaque identifier (with Paga it is the bank's UUID): always send back exactly the `code` you received when verifying a bank account. The list is cached for a few hours; if the payment provider is unreachable and no list has been cached yet, the response is 503."
 *     operationId: "merchant_get_api_v1_merchant_onboarding_banks"
 *     tags: ["Onboarding"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "Request completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BankListResponse"
 *       400:
 *         description: "Invalid request or validation failed"
 *       401:
 *         description: "Authentication required"
 */
