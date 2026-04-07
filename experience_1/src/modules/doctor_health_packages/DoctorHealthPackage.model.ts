import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_health_packages",
	timestamps: true,
	indexes: [
		{
			name: "doctor_health_packages_doctor_id_is_active_created_at_idx",
			fields: ["doctor_id", "is_active", "created_at"],
		},
	],
})
export class DoctorHealthPackage extends Model<DoctorHealthPackage> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Column(DataType.STRING)
	declare title: string;

	@Column(DataType.INTEGER)
	declare priceKobo: number;

	@Column(DataType.TEXT)
	declare description: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare coverImageUrl: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare attachmentUrl: string | null;

	@Default(0)
	@Column(DataType.INTEGER)
	declare soldCount: number;

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare deletedAt: Date | null;
}
