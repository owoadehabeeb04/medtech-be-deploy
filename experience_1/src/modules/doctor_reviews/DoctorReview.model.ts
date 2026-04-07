import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Appointment } from "../appointment/Appointment.model";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_reviews",
	timestamps: true,
	indexes: [
		{
			name: "doctor_reviews_appointment_id_unique",
			unique: true,
			fields: ["appointment_id"],
		},
		{
			name: "doctor_reviews_doctor_id_created_at_id_idx",
			fields: ["doctor_id", "created_at", "id"],
		},
		{
			name: "doctor_reviews_patient_id_idx",
			fields: ["patient_id"],
		},
	],
})
export class DoctorReview extends Model<DoctorReview> {
	@ForeignKey(() => Appointment)
	@Column(DataType.INTEGER)
	declare appointmentId: number;

	@BelongsTo(() => Appointment)
	declare appointment: Appointment;

	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare patientId: number;

	@BelongsTo(() => User)
	declare patient: User;

	@Column(DataType.INTEGER)
	declare rating: number;

	@Column(DataType.TEXT)
	declare comment: string;

	@Column(DataType.STRING)
	declare reviewerDisplayName: string;

	@Column(DataType.STRING)
	declare reviewerAvatarUrl: string | null;
}
