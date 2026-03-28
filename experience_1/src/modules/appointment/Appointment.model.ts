import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { Op } from "sequelize";
import { User } from "../users/User.model";
import { APPOINTMENT_STATUS } from "../../constants/constant";
import { ConsultationType } from "../consultation_type/ConsultationType.model";

@Table({ tableName: "appointments", timestamps: true })
export class Appointment extends Model<Appointment> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare appointmentBookedBy: number;
	@BelongsTo(() => User)
	declare appointmentBookedByDetails: User;

	@Column(DataType.STRING)
	declare patientName: string;

	@Column(DataType.STRING)
	declare gender: string;

	@Column(DataType.INTEGER)
	declare age: number;

	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare medicId: number;
	@BelongsTo(() => User)
	declare medicUser: User;

	@Column(DataType.DATE)
	declare scheduleDate: Date;

	@Column(DataType.TEXT)
	declare additionalInfo: string;

	@Default(APPOINTMENT_STATUS.PENDING)
	@Column(DataType.ENUM(...Object.values(APPOINTMENT_STATUS)))
	declare status: APPOINTMENT_STATUS; //APPOINTMENT_STATUS

	@AllowNull(true)
	@Column(DataType.STRING)
	declare consultationType: string;
	@BelongsTo(() => ConsultationType, { foreignKey: "consultationType", targetKey: "key", onDelete: "SET NULL" })
	declare consultationTypeDetails: ConsultationType;

	static async getAllAppointment(medicId: number, status: string | null, date: Date | null): Promise<Appointment[] | []> {
		let whereClause: Record<string, any> = { medicId };

		if (status) {
			whereClause.status = status;
		}

		if (date) {
			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);
			whereClause.scheduleDate = { [Op.between]: [startOfDay, endOfDay] };
		}

		return await this.findAll({
			where: whereClause,
			include: [
				{ model: User, as: "appointmentBookedByDetails" },
				{ model: User, as: "medicUser" },
			],
			order: [["scheduleDate", "ASC"]],
		});
	}
	static async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
		return await this.create({
			appointmentBookedBy: appointmentData.appointmentBookedBy,
			patientName: appointmentData.patientName,
			gender: appointmentData.gender,
			age: appointmentData.age,
			medicId: appointmentData.medicId,
			scheduleDate: appointmentData.scheduleDate,
			additionalInfo: appointmentData.additionalInfo,
			consultationType: appointmentData.consultationType,
		});
	}

	static async getAllMedicAppointments({
		medicId,
		status,
		date,
		limit,
		offset,
	}: {
		medicId: number;
		status?: string | null;
		date?: Date | null;
		limit?: number;
		offset?: number;
	}): Promise<{ rows: Appointment[] | []; count: number }> {
		let whereClause: Record<string, any> = { medicId };

		if (status) {
			whereClause.status = status;
		}

		if (date) {
			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);
			whereClause.scheduleDate = { [Op.between]: [startOfDay, endOfDay] };
		}

		return await this.findAndCountAll({
			where: whereClause,
			include: [
				{ model: User, as: "appointmentBookedByDetails" },
				{ model: User, as: "medicUser" },
			],
			order: [["scheduleDate", "ASC"]],
			limit: limit,
			offset: offset,
		});
	}
}
