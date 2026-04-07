import { Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "educational_histories",
	timestamps: true,
	indexes: [
		{
			name: "educational_histories_user_id_idx",
			fields: ["user_id"],
		},
	],
})
export class EducationalHistory extends Model<EducationalHistory> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;

	@Column(DataType.STRING)
	declare institute: string;

	@Column(DataType.STRING)
	declare certificate: string;

	@Column(DataType.DATE)
	declare startDate: Date;

	@Column(DataType.DATE)
	declare endDate: Date;
}
