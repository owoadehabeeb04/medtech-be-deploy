import { INTERNAL_SERVER_ERROR } from "http-status";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ERR_USER } from "../../constants/error-codes";
import { categoryGroupSlugParamSchema } from "./DrugstoreCategoryGroup.schema";
import { DrugstoreCategoryGroupService } from "./DrugstoreCategoryGroup.service";

const handleResponse = async (
	req: Request,
	res: Response,
	next: NextFunction,
	serviceCall: Promise<any>,
	errorSuffix: string
) => {
	const { manageApplicationErrors, manageAsyncOps, errorCode, encrypt } = req.context;
	const [error, data] = await manageAsyncOps(serviceCall);

	if (error) {
		return next(
			manageApplicationErrors({
				message: error.message,
				statusCode: INTERNAL_SERVER_ERROR,
				errorCode: errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	if (!data.status) {
		return next(
			manageApplicationErrors({
				message: data.message,
				statusCode: data.code || INTERNAL_SERVER_ERROR,
				errorCode: errorCode(ERR_USER, errorSuffix),
			})
		);
	}

	res.response = {
		message: data.message,
		statusCode: data.code,
		data: encrypt(data.data),
	};

	return next();
};

/**
 * @swagger
 * /api/v1/main/drugstore/categories:
 *   get:
 *     summary: Browse the top-level drugstore category groups
 *     description: Cross-pharmacy taxonomy used to power the "Browse by Category" home screen (e.g. Health & Wellness, Mother & Baby). Each group carries its own subcategory list for drill-down.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { type: array, items: { $ref: '#/components/schemas/DrugstoreCategoryGroupResponse' } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const listCategoryGroups: RequestHandler = async (req, res, next) =>
	handleResponse(req, res, next, DrugstoreCategoryGroupService.listGroups(), "D190");

/**
 * @swagger
 * /api/v1/main/drugstore/categories/{slug}:
 *   get:
 *     summary: Get a category group and its subcategories
 *     description: "Each subcategory's `name` is the value to pass as the `category` filter on GET /drugstore/catalog/products for the subcategory drill-down screen."
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         schema: { type: string, example: "health-wellness" }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Success." }
 *                 data: { $ref: '#/components/schemas/DrugstoreCategoryGroupResponse' }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden — caller must be a consumer or doctor, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Category group not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export const getCategoryGroup: RequestHandler = async (req, res, next) => {
	const params = req.context.validateSchema(categoryGroupSlugParamSchema, req.params, next);
	if (!params) return;

	return handleResponse(req, res, next, DrugstoreCategoryGroupService.getGroupBySlug(params.slug), "D191");
};
