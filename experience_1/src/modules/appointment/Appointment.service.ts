import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from "../../constants/constant";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { applicationConfig } from "../../config";
import { pagination } from "../../utils";
import { ApiResponse } from "../../utils/common.dto";
import { ConsultationType } from "../consultation_type/ConsultationType.model";
import { User } from "../users/User.model";
import { BookAppointmentDTO } from "./Appointment.dto";
import { Appointment } from "./Appointment.model";

export class AppointmentService {
	static async getAllAppointments(medicId: number, query: Record<string, any>): Promise<ApiResponse> {
		const status = query.status || APPOINTMENT_STATUS.PENDING;
		const date = query.date || null;

		const appointments = await Appointment.getAllAppointment(medicId, status, date);

		return {
			status: true,
			code: 200,
			data: appointments,
			message: RESPONSE_MESSAGES.APPOINTMENT_RETRIEVED,
		};
	}

	static async bookAppointment(data: BookAppointmentDTO): Promise<ApiResponse> {
		let patientName: string;
		let user: User | null = null;
		const consultationTypeKey = data.consultationType.trim().toLowerCase();

		if (data.appointmentType === APPOINTMENT_TYPE.PERSONAL && data.appointmentBookedBy) user = await User.findByPk(data.appointmentBookedBy);

		patientName = user ? `${user.firstName?.toLowerCase()} ${user.lastName?.toLowerCase()}` : data.patientName;

		let consultationType = await ConsultationType.findOne({
			where: {
				key: consultationTypeKey,
				isActive: true,
			},
		});

		if (!consultationType) {
			if (applicationConfig.isProduction) {
				return {
					status: false,
					code: 400,
					message: "Consultation type not found",
				};
			}

			consultationType = await ConsultationType.create({
				name: consultationTypeKey.replace(/[_-]+/g, " "),
				key: consultationTypeKey,
				isActive: true,
			});
		}

		const newAppointment = await Appointment.createAppointment({
			appointmentBookedBy: data.appointmentBookedBy || null,
			patientName,
			gender: data.gender,
			age: data.age,
			medicId: data.medicId,
			scheduleDate: data.scheduleDate,
			additionalInfo: data.additionalInfo ? data.additionalInfo.trim().toLowerCase() : null,
			consultationType: consultationType.key,
		});

		const plainData = newAppointment.get({ plain: true });

		//SEND NOTIFICATION TO MEDIC ABOUT NEW APPOINTMENT

		return {
			status: true,
			code: 201,
			data: plainData,
			message: RESPONSE_MESSAGES.APPOINTMENT_BOOKED,
		};
	}

	static async getAllMedicAppointments(medicId: number, query: Record<string, any>): Promise<ApiResponse> {
		const page = parseInt(query.page) || 1;
		const limit = parseInt(query.limit) || 10;
		const offset = (page - 1) * limit;
		const status = (query.status as APPOINTMENT_STATUS) || null;
		const date = query.date || null;

		const { rows: appointments, count } = await Appointment.getAllMedicAppointments({
			medicId,
			status,
			date,
			limit,
			offset,
		});

		const pgDt = pagination(appointments, limit, page, count);

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: pgDt
		};
	}
}
