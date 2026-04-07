import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";
import { DoctorReview } from "./DoctorReview.model";

@Table({
	tableName: "doctor_review_replies",
	timestamps: true,
	indexes: [
		{
			name: "doctor_review_replies_review_id_unique",
			unique: true,
			fields: ["review_id"],
		},
	],
})
export class DoctorReviewReply extends Model<DoctorReviewReply> {
	@ForeignKey(() => DoctorReview)
	@Column(DataType.INTEGER)
	declare reviewId: number;

	@BelongsTo(() => DoctorReview)
	declare review: DoctorReview;

	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Column(DataType.TEXT)
	declare message: string;
}
