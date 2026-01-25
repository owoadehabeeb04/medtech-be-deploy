export interface CreateUserTypeDTO {
  name: string;
  key: string;
  permissionIds?: number[];
}

export interface UpdateUserTypeDTO {
  name?: string;
  key?: string;
  isActive?: boolean;
}