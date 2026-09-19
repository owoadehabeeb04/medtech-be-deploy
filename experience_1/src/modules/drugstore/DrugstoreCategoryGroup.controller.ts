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
 *     summary: Browse the global product category tree
 *     description: Returns the platform-wide category tree from the Merchant service. Omit parentId to show the five top-level categories; pass parentId to drill into a branch, or search to find matching categories and their descendants.
 *     tags: [Drugstore]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: parentId
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Return direct children of this category.
 *       - name: search
 *         in: query
 *         schema: { type: string, example: Shampoo }
 *         description: Search names/keys; matching groups include their descendants.
 *       - name: includeChildren
 *         in: query
 *         schema: { type: boolean, default: false }
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
	handleResponse(
		req,
		res,
		next,
		DrugstoreCategoryGroupService.listGroups({
			parentId: req.query.parentId ? String(req.query.parentId) : undefined,
			search: req.query.search ? String(req.query.search) : undefined,
			includeChildren: req.query.includeChildren === "true",
		}),
		"D190"
	);

/**
 * @swagger
 * /api/v1/main/drugstore/categories/{slug}:
 *   get:
 *     summary: Get a global category and its descendants
 *     description: Returns the selected category, its breadcrumb, and active descendants. Use the returned detailed category id as categoryId when filtering products.
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
