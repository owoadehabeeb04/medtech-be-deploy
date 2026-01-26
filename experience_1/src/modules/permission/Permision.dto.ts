export interface CreatePermissionDTO {
	key: string;
	name: string;
	module: string;
	description: string;
}

export interface AssignPermissionToUserTypeDTO {
	userTypeId: number;
	permissionIds: number[];
}

export interface RemovePermissionFromUserTypeDTO {
	userTypeId: number;
	permissionIds: number[];
}

export interface ManageUserPermissionDTO {
	userId: number;
	permissionIds: number[];
	granted: boolean;
}
