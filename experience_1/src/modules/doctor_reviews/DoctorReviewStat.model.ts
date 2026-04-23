import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_review_stats",
	timestamps: true,
	indexes: [
		{
			name: "doctor_review_stats_doctor_id_unique",
			unique: true,
			fields: ["doctor_id"],
		},
	],
})
export class DoctorReviewStat extends Model<DoctorReviewStat> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Default(0)
	@Column(DataType.DECIMAL(4, 2))
	declare averageRating: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare totalReviews: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare rating1Count: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare rating2Count: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare rating3Count: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare rating4Count: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare rating5Count: number;
}
