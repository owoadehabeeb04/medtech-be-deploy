import { Table, Column, Model, BelongsToMany, Unique, DataType } from "sequelize-typescript";
import { UserTypePermission } from "../user_type_permission/UserTypePermission.model";
import { UserType } from "../user_types/UserType.model";
import { CreatePermissionDTO } from "./Permision.dto";

@Table({ tableName: "permissions", timestamps: true })
export class Permission extends Model {
	@Unique(true)
	@Column(DataType.STRING)
	declare key: string; // e.g., 'schemes.view', 'schemes.create', 'uploads.review'

	@Column(DataType.STRING)
	declare name: string; // e.g., 'View Schemes', 'Create Schemes'

	@Column(DataType.STRING)
	declare module: string; // e.g., 'schemes', 'uploads', 'users'

	@Column(DataType.STRING)
	declare description: string;

	@BelongsToMany(() => UserType, () => UserTypePermission)
	declare userTypes: UserType[];

	static async getByKey(key: string) {
		return this.findOne({
			where: { key },
		});
	}

	static async createPermission(data: CreatePermissionDTO) {
		return this.create({
			key: data.key.toLowerCase(),
			name: data.name,
			module: data.module,
			description: data.description.toLowerCase(),
		});
	}

	static async getAll() {
		return this.findAll({
			order: [
				["module", "ASC"],
				["name", "ASC"],
			],
		});
	}
}
