import Joi from "joi";

export const CreatePermissionSchema = Joi.object({
	key: Joi.string().required(),
	name: Joi.string().required(),
	description: Joi.string().required(),
	module: Joi.string().required(),
});

export const AssignPermissionToUserSchema = Joi.object({
	userTypeId: Joi.number().required(),
	permissionIds: Joi.array().items(Joi.number().required()).min(1).required(),
});

export const RemovePermissionFromUserSchema = Joi.object({
	userTypeId: Joi.number().required(),
	permissionIds: Joi.array().items(Joi.number().required()).min(1).required(),
});

export const ManageUserPermissionSchema = Joi.object({
	userId: Joi.string().required(),
	permissions: Joi.array().items(Joi.any()).required(),
	removePermissions: Joi.array().items(Joi.string()).required(),
});

export const GetUserTypePermissionsSchema = Joi.object({
	userTypeId: Joi.number().required(),
});

export const GetUserPermissionsSchema = Joi.object({
	userId: Joi.string().required(),
});

export const BulkCreatePermissionSchema = Joi.object({
	permissions: Joi.array()
		.items(
			Joi.object({
				key: Joi.string().trim().required(),
				name: Joi.string().trim().required(),
				module: Joi.string().trim().required(),
				description: Joi.string().trim().required(),
			})
		)
		.min(1)
		.required(),
});

export const BulkAssignPermissionSchema = Joi.object({
	assignments: Joi.array()
		.items(
			Joi.object({
				userTypeId: Joi.number().required(),
				permissionIds: Joi.array().items(Joi.number().required()).min(1).required(),
			})
		)
		.min(1)
		.required(),
});
