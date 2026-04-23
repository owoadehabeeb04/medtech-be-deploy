export interface UpsertDoctorConsultationRateDTO {
	amountNgn: number;
	durationMinutes: number;
}

export interface DoctorSubscriptionPlanInputDTO {
	title: string;
	amountNgn: number;
	durationDays: number;
	sortOrder?: number;
}

export interface ReplaceDoctorSubscriptionPlansDTO {
	plans: DoctorSubscriptionPlanInputDTO[];
}
