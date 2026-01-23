import { Table, Column, Model, ForeignKey, DataType } from "sequelize-typescript";
import { UserType } from "../user_types/UserType.model";
import { Permission } from "../permission/Permission.model";

@Table({ tableName: "user_type_permissions", timestamps: false })
export class UserTypePermission extends Model {
	@ForeignKey(() => UserType)
	@Column(DataType.INTEGER)
	declare userTypeId: number;

	@ForeignKey(() => Permission)
	@Column(DataType.INTEGER)
	declare permissionId: number;

	static async destroyByUserType(userTypeId: number) {
		await this.destroy({ where: { userTypeId } });
	}

	static async destroyByPermission(permissionId: number) {
		await this.destroy({ where: { permissionId } });
	}
}
