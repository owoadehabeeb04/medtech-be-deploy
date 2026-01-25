import { Sequelize } from "sequelize";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { UserTypePermission } from "../user_type_permission/UserTypePermission.model";
import { UserType } from "../user_types/UserType.model";
import { AssignPermissionToUserTypeDTO, CreatePermissionDTO, RemovePermissionFromUserTypeDTO } from "./Permision.dto";
import { Permission } from "./Permission.model";

export class PermissionService {
	// Create a new permission
	static async createPermission(data: CreatePermissionDTO): Promise<ApiResponse> {
		const existingPermission = await Permission.getByKey(data.key);

		if (existingPermission) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.PERMISSION_EXIST,
			};
		}

		const permission = await Permission.createPermission({
			key: data.key,
			name: data.name,
			module: data.module,
			description: data.description,
		});

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: permission,
		};
	}

	static async bulkCreatePermissions(data: { permissions: CreatePermissionDTO[] }): Promise<ApiResponse> {
		const { permissions } = data;

		// Remove duplicate keys inside the request payload
		const uniquePayload = Array.from(new Map(permissions.map((p) => [p.key.toLowerCase(), p])).values());

		// Fetch existing permissions by key
		const existing = await Permission.findAll({
			where: {
				key: uniquePayload.map((p) => p.key.toLowerCase()),
			},
		});

		const existingKeys = new Set(existing.map((p) => p.key));

		const toCreate = uniquePayload.filter((p) => !existingKeys.has(p.key.toLowerCase()));
		const skipped = uniquePayload.filter((p) => existingKeys.has(p.key.toLowerCase()));

		// Create the new permissions
		let created: Permission[] = [];
		if (toCreate.length > 0) {
			created = await Permission.bulkCreate(
				toCreate.map((p) => ({
					key: p.key.toLowerCase(),
					name: p.name,
					module: p.module,
					description: p.description.toLowerCase(),
				}))
			);
		}

		return {
			status: true,
			code: 201,
			message: "Permissions processed successfully",
			data: {
				created,
				skipped,
				totalReceived: permissions.length,
				totalCreated: created.length,
				totalSkipped: skipped.length,
			},
		};
	}

	// Get all permissions
	static async getAllPermissions(): Promise<ApiResponse> {
		const permissions = await Permission.getAll();

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: permissions,
		};
	}

	// Assign permissions to a user type
	static async assignPermissionsToUserType(data: AssignPermissionToUserTypeDTO): Promise<ApiResponse> {
		const userType = await UserType.getById(data.userTypeId);

		if (!userType) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.NOT_FOUND,
			};
		}

		// Remove existing permissions first
		await UserTypePermission.destroyByUserType(data.userTypeId);

		// Add new permissions
		const assignments = data.permissionIds.map((permissionId) => ({
			userTypeId: data.userTypeId,
			permissionId,
		}));

		await UserTypePermission.bulkCreate(assignments);

		return {
			status: true,
			code: 200,
			message: "Permissions assigned to user type successfully",
			data: { userTypeId: data.userTypeId, permissionIds: data.permissionIds },
		};
	}

	// Remove permissions from a user type
	static async removePermissionsFromUserType(data: RemovePermissionFromUserTypeDTO): Promise<ApiResponse> {
		const userType = await UserType.getById(data.userTypeId);

		if (!userType) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.NOT_FOUND,
			};
		}

		await UserTypePermission.destroy({
			where: {
				userTypeId: data.userTypeId,
				permissionId: data.permissionIds,
			},
		});

		return {
			status: true,
			code: 200,
			message: "Permissions removed from user type successfully",
			data: { userTypeId: data.userTypeId, removedPermissionIds: data.permissionIds },
		};
	}

	// Get all permissions for a user type
	static async getUserTypePermissions(userTypeId: number): Promise<ApiResponse> {
		const userType = await UserType.getById(userTypeId);

		if (!userType) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.NOT_FOUND,
			};
		}

		return {
			status: true,
			code: 200,
			message: "User type permissions retrieved successfully",
			data: {
				userType: {
					id: userType.id,
					name: userType.name,
					key: userType.key,
				},
				permissions: userType.permissions,
			},
		};
	}

	static async bulkAssignPermissions(payload: { assignments: AssignPermissionToUserTypeDTO[] }, sequelize: Sequelize): Promise<ApiResponse> {
		const { assignments } = payload;

		if (!assignments || assignments.length === 0) {
			return {
				status: false,
				code: 400,
				message: "No assignments provided in request body",
			};
		}

		const userTypeIds = assignments.map((a) => a.userTypeId);
		const allPermissionIds = [...new Set(assignments.flatMap((a) => a.permissionIds))]; // unique

		return await sequelize.transaction(async (t) => {
			// 1. Validate all user types exist
			const userTypes = await UserType.findAll({
				where: { id: userTypeIds },
				attributes: ["id"],
				transaction: t,
			});

			const foundUserTypeIds = userTypes.map((ut) => ut.id);
			const missingUserTypeIds = userTypeIds.filter((id) => !foundUserTypeIds.includes(id));

			if (missingUserTypeIds.length > 0) {
				return {
					status: false,
					code: 404,
					message: `User types not found: ${missingUserTypeIds.join(", ")}`,
				};
			}

			// 2. Validate all permission IDs exist (if any provided)
			if (allPermissionIds.length > 0) {
				const permissions = await Permission.findAll({
					where: { id: allPermissionIds },
					attributes: ["id"],
					transaction: t,
				});

				const foundPermissionIds = permissions.map((p) => p.id);
				const invalidPermissionIds = allPermissionIds.filter((id) => !foundPermissionIds.includes(id));

				if (invalidPermissionIds.length > 0) {
					return {
						status: false,
						code: 400,
						message: `Invalid permission IDs: ${invalidPermissionIds.join(", ")}`,
					};
				}
			}

			// 3. Delete existing permissions for these user types
			await UserTypePermission.destroy({
				where: { userTypeId: userTypeIds },
				transaction: t,
			});

			// 4. Prepare bulk insert records
			const recordsToInsert = assignments.flatMap((assign) =>
				assign.permissionIds.map((permissionId) => ({
					userTypeId: assign.userTypeId,
					permissionId,
				}))
			);

			// 5. Insert new assignments
			if (recordsToInsert.length > 0) {
				await UserTypePermission.bulkCreate(recordsToInsert, {
					transaction: t,
					ignoreDuplicates: true,
				});
			}

			// Success!
			return {
				status: true,
				code: 200,
				message: "Bulk permissions assigned successfully",
				data: {
					totalUserTypes: assignments.length,
					totalAssignments: recordsToInsert.length,
					summary: assignments.map((a) => ({
						userTypeId: a.userTypeId,
						permissionsAssigned: a.permissionIds.length,
					})),
				},
			};
		});
	}
}
