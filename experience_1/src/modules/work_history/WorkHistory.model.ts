import { Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({ tableName: "work_histories", timestamps: true })
export class WorkHistory extends Model<WorkHistory> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;

	@Column(DataType.STRING)
	declare company: string;

	@Column(DataType.STRING)
	declare designation: string;

	@Column(DataType.DATE)
	declare startDate: Date;

	@Column(DataType.DATE)
	declare endDate: Date;
}
