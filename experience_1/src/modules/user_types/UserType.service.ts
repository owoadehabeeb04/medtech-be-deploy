import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { User } from "../users/User.model";
import { UserTypePermission } from "../user_type_permission/UserTypePermission.model";
import { CreateUserTypeDTO, UpdateUserTypeDTO } from "./UserType.dto";
import { UserType } from "./UserType.model";

export class UserTypeService {
	static async createUserType(data: CreateUserTypeDTO): Promise<ApiResponse> {
		const existingUserType = await UserType.findByKey(data.key);

		if (existingUserType) {
			return {
				status: false,
				code: 400,
				message: "User type with this key already exists",
			};
		}

		const userType = await UserType.create({
			name: data.name,
			key: data.key.toLowerCase(),
			isActive: true,
		});

		// Assign permissions if provided
		if (data.permissionIds && data.permissionIds.length > 0) {
			const assignments = data.permissionIds.map((permissionId) => ({
				userTypeId: userType.id,
				permissionId,
			}));

			await UserTypePermission.bulkCreate(assignments);
		}

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.USER_TYPE_CREATED,
			data: userType,
		};
	}

	static async getAllUserTypes(): Promise<ApiResponse> {
		const userTypes = await UserType.getAll();

		return {
			status: true,
			code: 200,
			message: "User types retrieved successfully",
			data: userTypes,
		};
	}

	static async getUserTypeById(userTypeId: number): Promise<ApiResponse> {
		const userType = await UserType.getById(userTypeId);

		if (!userType) {
			return {
				status: false,
				code: 404,
				message: "User type not found",
			};
		}

		return {
			status: true,
			code: 200,
			message: "User type retrieved successfully",
			data: userType,
		};
	}

	static async updateUserType(userTypeId: number, data: UpdateUserTypeDTO): Promise<ApiResponse> {
		const userType = await UserType.getById(userTypeId);

		if (!userType) {
			return {
				status: false,
				code: 404,
				message: "User type not found",
			};
		}

		if (data.key && data.key !== userType.key) {
			const existing = await UserType.findByKey(data.key);

			if (existing) {
				return {
					status: false,
					code: 400,
					message: "User type key already exists",
				};
			}
		}

		await userType.update(data);

		return {
			status: true,
			code: 200,
			message: "User type updated successfully",
			data: userType,
		};
	}

	static async deleteUserType(userTypeId: number): Promise<ApiResponse> {
		const userType = await UserType.getById(userTypeId);
		if (!userType) {
			return {
				status: false,
				code: 404,
				message: "User type not found",
			};
		}

		// Check if any users are using this user type
		const usersCount = await User.count({ where: { userType: userType.key } });
		if (usersCount > 0) {
			return {
				status: false,
				code: 400,
				message: "Cannot delete user type that is assigned to users",
			};
		}

		// Delete associated permissions
		await UserTypePermission.destroy({ where: { userTypeId } });

		// Delete user type
		await userType.destroy();

		return {
			status: true,
			code: 200,
			message: "User type deleted successfully",
		};
	}
}
