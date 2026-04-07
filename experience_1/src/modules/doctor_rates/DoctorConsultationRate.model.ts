import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_consultation_rates",
	timestamps: true,
	indexes: [
		{
			name: "doctor_consultation_rates_doctor_id_unique",
			unique: true,
			fields: ["doctor_id"],
		},
	],
})
export class DoctorConsultationRate extends Model<DoctorConsultationRate> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Column(DataType.INTEGER)
	declare amountKobo: number;

	@Column(DataType.INTEGER)
	declare durationMinutes: number;

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;
}
