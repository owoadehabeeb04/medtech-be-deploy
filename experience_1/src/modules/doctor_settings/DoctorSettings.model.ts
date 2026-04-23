import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_settings",
	timestamps: true,
	indexes: [
		{
			name: "doctor_settings_doctor_id_unique",
			unique: true,
			fields: ["doctor_id"],
		},
	],
})
export class DoctorSettings extends Model<DoctorSettings> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare pushNotificationsEnabled: boolean;

	@Default(false)
	@Column(DataType.BOOLEAN)
	declare biometricLoginEnabled: boolean;

	@Default(false)
	@Column(DataType.BOOLEAN)
	declare autoLogoutOnAppClose: boolean;

	static async findOrCreateForDoctor(doctorId: number): Promise<DoctorSettings> {
		const [settings] = await this.findOrCreate({
			where: { doctorId },
			defaults: { doctorId },
		});

		return settings;
	}
}
