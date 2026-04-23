export interface DoctorAccountDTO {
	firstName?: string;
	lastName?: string;
	phoneNumber?: string;
	email?: string;
}

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
	country?: string | null;
	postalCode?: string | null;
}

export interface DoctorEducationDTO {
	institution?: string;
	institute?: string;
	certificate: string;
	startDate: Date;
	endDate?: Date;
}

export interface DoctorWorkHistoryDTO {
	companyOrInstitution?: string;
	company?: string;
	designation: string;
	startDate: Date;
	endDate?: Date;
}

export interface DoctorSpecialtiesDTO {
	specialityIds?: number[];
	specialtyIds?: number[];
	yearsOfExperience?: number;
	bio?: string;
}
