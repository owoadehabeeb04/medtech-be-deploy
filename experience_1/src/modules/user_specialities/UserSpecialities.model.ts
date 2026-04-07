import { BelongsTo, Column, DataType, ForeignKey, Min, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";
import { Speciality } from "../speciality/Speciality.model";

@Table({
	tableName: "user_specialities",
	timestamps: false,
	indexes: [
		{
			name: "user_specialities_user_id_idx",
			fields: ["user_id"],
		},
	],
})
export class UserSpeciality extends Model<UserSpeciality> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;
	@BelongsTo(() => User)
	declare user: User;

	@ForeignKey(() => Speciality)
	@Column(DataType.INTEGER)
	declare specialityId: number;
	@BelongsTo(() => Speciality)
	declare speciality: Speciality;

	@Min(0)
	@Column(DataType.INTEGER)
	declare yearsOfExperience: number;

	@Column(DataType.TEXT)
	declare bio: string;

	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	static async getMedicsBySpeciality(specialityId: number): Promise<UserSpeciality[] | []> {
		return await this.findAll({
			where: { specialityId, isActive: true },
			include: [{ model: User, where: { isActive: true, userType: ["doctor", "medic"] } }, { model: Speciality }],
		});
	}
}
