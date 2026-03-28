export interface DoctorBasicProfileDTO {
	firstName?: string;
	lastName?: string;
	phoneNumber?: string;
	medicalLicenseNumber?: string;
	yearsOfExperience?: number;
	bio?: string;
}

export interface DoctorAddressDTO {
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
}

export interface DoctorEducationDTO {
	institute: string;
	certificate: string;
	startDate: Date;
	endDate?: Date;
}

export interface DoctorWorkHistoryDTO {
	company: string;
	designation: string;
	startDate: Date;
	endDate?: Date;
}

export interface DoctorSpecialtiesDTO {
	specialityIds: number[];
	yearsOfExperience?: number;
	bio?: string;
}
