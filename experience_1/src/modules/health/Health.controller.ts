import { NextFunction, Request, Response } from "express";
import { HealthService } from "./Health.service";
import { ERR_USER } from "../../constants/error-codes";
import { INTERNAL_SERVER_ERROR, OK } from "http-status";

/**
 * @swagger
 * /api/v1/main/health:
 *   get:
 *     summary: Check service health
 *     description: Runs app, database, and Redis checks in parallel. Returns 200 only if all three are up; if any is down, the service still responds with an error (currently surfaced as 500, not 503).
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All checks passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "System is up and running." }
 *                 data: { $ref: '#/components/schemas/HealthResponse' }
 *       500: { description: One or more services are down, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
	const { manageApplicationErrors, manageAsyncOps, errorCode } = req.context;

	const [error, data] = await manageAsyncOps(HealthService.checkAll());

	if (error) {
		console.log(error);
		return next(manageApplicationErrors({ message: error.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "100") }));
	}

	if (!data.status) return next(manageApplicationErrors({ message: data.message, statusCode: INTERNAL_SERVER_ERROR, errorCode: errorCode(ERR_USER, "101") }));

	res.response = {
		statusCode: OK,
		message: data.message,
		data: data.data,
	};

	return next();
};
