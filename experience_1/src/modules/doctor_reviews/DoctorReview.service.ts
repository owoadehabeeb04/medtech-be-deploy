import { Op, Sequelize, Transaction } from "sequelize";
import { APPOINTMENT_STATUS } from "../../constants/constant";
import { ApiResponse } from "../../utils/common.dto";
import { Appointment } from "../appointment/Appointment.model";
import { UserProfile } from "../user_profile/UserProfile.model";
import { User } from "../users/User.model";
import { CreateDoctorReviewDTO, CreateDoctorReviewReplyDTO, GetDoctorReviewsQueryDTO } from "./DoctorReview.dto";
import { DoctorReview } from "./DoctorReview.model";
import { DoctorReviewReply } from "./DoctorReviewReply.model";
import { DoctorReviewStat } from "./DoctorReviewStat.model";

const serializeReply = (reply?: DoctorReviewReply | null) =>
	reply
		? {
				id: reply.id,
				message: reply.message,
				createdAt: reply.createdAt,
				updatedAt: reply.updatedAt,
		  }
		: null;

const serializeRatingBreakdown = (stat?: DoctorReviewStat | null) => ({
	1: stat?.rating1Count || 0,
	2: stat?.rating2Count || 0,
	3: stat?.rating3Count || 0,
	4: stat?.rating4Count || 0,
	5: stat?.rating5Count || 0,
});

const serializeSummary = (stat?: DoctorReviewStat | null) => ({
	averageRating: stat ? Number(Number(stat.averageRating || 0).toFixed(2)) : 0,
	totalReviews: stat?.totalReviews || 0,
	ratingBreakdown: serializeRatingBreakdown(stat),
});

export class DoctorReviewService {
	private static buildReviewerDisplayName(user?: User | null, profile?: UserProfile | null, appointment?: Appointment | null) {
		const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
		if (fullName) return fullName;
		if (profile?.username) return profile.username;
		if (appointment?.patientName) return appointment.patientName;
		return "Patient";
	}

	private static buildReviewerAvatarUrl(user?: User | null, profile?: UserProfile | null) {
		return profile?.profileImage || user?.profilePicture || null;
	}

	private static async ensureReviewStat(doctorId: number, transaction: Transaction) {
		const [stat] = await DoctorReviewStat.findOrCreate({
			where: { doctorId },
			defaults: { doctorId },
			transaction,
		});

		return stat;
	}

	private static async updateReviewStatOnCreate(doctorId: number, rating: number, transaction: Transaction) {
		const stat = await this.ensureReviewStat(doctorId, transaction);
		const previousTotal = stat.totalReviews || 0;
		const previousAverage = Number(stat.averageRating || 0);
		const totalReviews = previousTotal + 1;
		const averageRating = Number((((previousAverage * previousTotal) + rating) / totalReviews).toFixed(2));

		const nextBucketValues = {
			rating1Count: stat.rating1Count || 0,
			rating2Count: stat.rating2Count || 0,
			rating3Count: stat.rating3Count || 0,
			rating4Count: stat.rating4Count || 0,
			rating5Count: stat.rating5Count || 0,
		};

		if (rating === 1) nextBucketValues.rating1Count += 1;
		if (rating === 2) nextBucketValues.rating2Count += 1;
		if (rating === 3) nextBucketValues.rating3Count += 1;
		if (rating === 4) nextBucketValues.rating4Count += 1;
		if (rating === 5) nextBucketValues.rating5Count += 1;

		await stat.update(
			{
				totalReviews,
				averageRating,
				...nextBucketValues,
			},
			{ transaction }
		);

		return stat;
	}

	static async createReview(
		patientId: number,
		appointmentId: number,
		data: CreateDoctorReviewDTO,
		sequelize: Sequelize
	): Promise<ApiResponse> {
		return sequelize.transaction(async (transaction) => {
			const appointment = await Appointment.findByPk(appointmentId, { transaction });
			if (!appointment) {
				return {
					status: false,
					code: 404,
					message: "Appointment not found",
				};
			}

			if (appointment.appointmentBookedBy !== patientId) {
				return {
					status: false,
					code: 403,
					message: "You can only review your own completed appointment",
				};
			}

			if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
				return {
					status: false,
					code: 400,
					message: "Only completed appointments can be reviewed",
				};
			}

			if (!appointment.medicId) {
				return {
					status: false,
					code: 400,
					message: "Appointment is not linked to a doctor",
				};
			}

			const existingReview = await DoctorReview.findOne({
				where: { appointmentId },
				transaction,
			});

			if (existingReview) {
				return {
					status: false,
					code: 400,
					message: "A review already exists for this appointment",
				};
			}

			const patient = await User.findByPk(patientId, {
				attributes: ["id", "firstName", "lastName", "profilePicture"],
				include: [{ model: UserProfile, as: "userProfile", attributes: ["username", "profileImage"] }],
				transaction,
			});

			const patientProfile = patient?.userProfile || null;
			const review = await DoctorReview.create(
				{
					appointmentId,
					doctorId: appointment.medicId,
					patientId,
					rating: data.rating,
					comment: data.comment.trim(),
					reviewerDisplayName: this.buildReviewerDisplayName(patient, patientProfile, appointment),
					reviewerAvatarUrl: this.buildReviewerAvatarUrl(patient, patientProfile),
				},
				{ transaction }
			);

			const stat = await this.updateReviewStatOnCreate(appointment.medicId, data.rating, transaction);

			return {
				status: true,
				code: 201,
				message: "Doctor review created successfully",
				data: {
						review: {
							id: review.id,
							appointmentId: review.appointmentId,
						doctorId: review.doctorId,
						patientId: review.patientId,
						rating: review.rating,
							comment: review.comment,
							reviewerDisplayName: review.reviewerDisplayName,
							reviewerAvatarUrl: review.reviewerAvatarUrl,
							createdAt: review.createdAt,
							reply: serializeReply(null),
						},
						summary: serializeSummary(stat),
					},
			};
		});
	}

	static async getDoctorReviewSummary(doctorId: number): Promise<ApiResponse> {
		const stat = await DoctorReviewStat.findOne({ where: { doctorId } });

		return {
			status: true,
			code: 200,
			message: "Doctor review summary retrieved successfully",
			data: serializeSummary(stat),
		};
	}

	static async getDoctorReviews(doctorId: number, query: GetDoctorReviewsQueryDTO): Promise<ApiResponse> {
		const limit = Math.min(query.limit || 10, 50);
		const where: Record<string, any> = { doctorId };

		if (query.cursorCreatedAt && query.cursorId) {
			Object.assign(where, {
				[Op.or]: [
					{ createdAt: { [Op.lt]: query.cursorCreatedAt } },
					{
						createdAt: query.cursorCreatedAt,
						id: { [Op.lt]: query.cursorId },
					},
				],
			});
		}

		const reviews = await DoctorReview.findAll({
			where,
			order: [
				["createdAt", "DESC"],
				["id", "DESC"],
			],
			limit: limit + 1,
		});

		const hasNextPage = reviews.length > limit;
		const pageItems = hasNextPage ? reviews.slice(0, limit) : reviews;
		const reviewIds = pageItems.map((review) => review.id);
		const replies = reviewIds.length
			? await DoctorReviewReply.findAll({
					where: { reviewId: reviewIds },
			  })
			: [];

		const replyByReviewId = new Map(replies.map((reply) => [reply.reviewId, reply]));
		const lastItem = pageItems[pageItems.length - 1];

		return {
			status: true,
			code: 200,
			message: "Doctor reviews retrieved successfully",
			data: {
				items: pageItems.map((review) => ({
					id: review.id,
					rating: review.rating,
					comment: review.comment,
					reviewerDisplayName: review.reviewerDisplayName,
					reviewerAvatarUrl: review.reviewerAvatarUrl,
					createdAt: review.createdAt,
					reply: serializeReply(replyByReviewId.get(review.id) || null),
				})),
				pageInfo: {
					hasNextPage,
					nextCursorCreatedAt: hasNextPage && lastItem ? lastItem.createdAt : null,
					nextCursorId: hasNextPage && lastItem ? lastItem.id : null,
				},
			},
		};
	}

	static async createDoctorReply(doctorId: number, reviewId: number, data: CreateDoctorReviewReplyDTO): Promise<ApiResponse> {
		const review = await DoctorReview.findByPk(reviewId);
		if (!review) {
			return {
				status: false,
				code: 404,
				message: "Review not found",
			};
		}

		if (review.doctorId !== doctorId) {
			return {
				status: false,
				code: 403,
				message: "You can only reply to your own reviews",
			};
		}

		const existingReply = await DoctorReviewReply.findOne({
			where: { reviewId },
		});

		if (existingReply) {
			return {
				status: false,
				code: 400,
				message: "A reply already exists for this review",
			};
		}

		const reply = await DoctorReviewReply.create({
			reviewId,
			doctorId,
			message: data.message.trim(),
		});

		return {
			status: true,
			code: 201,
			message: "Doctor review reply created successfully",
			data: {
				reviewId,
				reply: serializeReply(reply),
			},
		};
	}
}
