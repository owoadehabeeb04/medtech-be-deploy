import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_device_tokens",
	timestamps: true,
	indexes: [
		{
			name: "doctor_device_tokens_doctor_id_device_id_unique",
			unique: true,
			fields: ["doctor_id", "device_id"],
		},
		{
			name: "doctor_device_tokens_device_token_idx",
			fields: ["device_token"],
		},
		{
			name: "doctor_device_tokens_doctor_id_is_active_idx",
			fields: ["doctor_id", "is_active"],
		},
	],
})
export class DoctorDeviceToken extends Model<DoctorDeviceToken> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Column(DataType.STRING)
	declare deviceId: string;

	@Column(DataType.TEXT)
	declare deviceToken: string;

	@Column(DataType.ENUM("ios", "android"))
	declare platform: "ios" | "android";

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@Column(DataType.DATE)
	declare lastSeenAt: Date;
}
