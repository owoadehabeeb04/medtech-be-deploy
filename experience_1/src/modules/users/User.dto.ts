export interface CreateUserDTO {
	firstName: string;
	lastName: string;
	email: string;
	verificationNumber?: string;
	medicalLicenseNumber?: string;
	phoneNumber?: string;
	tnc?: boolean;
	userType?: string;
	password?: string;
}

export interface UsernameDTO {
	userName: string;
}

export interface CompleteProfileDTO {
	dialCode?: string;
	phoneNumber?: string;
	dob?: Date;
	houseNumber?: string;
	street?: string;
	lga?: string;
	state?: string;
	profilePicture?: string;
}

export interface MedicCompleteProfileDTO {
	address: {
		line1: string;
		line2: string;
		city: string;
		state: string;
	};
	education: {
		institution: string;
		certificate: string;
		startDate: Date;
		endDate: Date;
	}[];
	workHistory: {
		company: string;
		designation: string;
		startDate: Date;
		endDate: Date;
	}[];
	speciality: {
		specialityId: number;
		yearsOfExperience: number;
		bio: string;
	}[];
}
