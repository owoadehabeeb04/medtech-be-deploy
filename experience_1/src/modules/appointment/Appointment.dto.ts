import { APPOINTMENT_TYPE } from "../../constants/constant";

export interface BookAppointmentDTO {
	appointmentBookedBy?: number;
	patientName: string;
	gender: string;
	age: number;
	medicId: number;
	scheduleDate: Date;
	additionalInfo?: string;
	appointmentType?: APPOINTMENT_TYPE;
	consultationType: string;
}
