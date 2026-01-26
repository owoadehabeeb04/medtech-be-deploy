import { Table, Column, Model, DataType, Unique, HasMany, BelongsToMany, Default } from "sequelize-typescript";
import { User } from "../users/User.model";
import { Permission } from "../permission/Permission.model";
import { UserTypePermission } from "../user_type_permission/UserTypePermission.model";

@Table({ tableName: "user_types", timestamps: false })
export class UserType extends Model<UserType> {
	@Column(DataType.STRING)
	declare name: string;

	@Unique(true)
	@Column(DataType.STRING)
	declare key: string; // broker, underwriter, backoffice

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@HasMany(() => User, "userType")
	users!: User[];

	@BelongsToMany(() => Permission, () => UserTypePermission)
	permissions!: Permission[];

	static async getById(id: number) {
		return await this.findByPk(id, {
			include: [{ model: Permission, as: "permissions" }],
		});
	}

	static async findByKey(key: string) {
		return await this.findOne({
			where: { key },
		});
	}

	static async getAll() {
		return await this.findAll({
			include: [{ model: Permission, as: "permissions" }],
			order: [["name", "ASC"]],
		});
	}
}
