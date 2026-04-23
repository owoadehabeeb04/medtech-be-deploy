export interface CreateDoctorReviewDTO {
	rating: number;
	comment: string;
}

export interface CreateDoctorReviewReplyDTO {
	message: string;
}

export interface GetDoctorReviewsQueryDTO {
	limit?: number;
	cursorCreatedAt?: Date;
	cursorId?: number;
}
