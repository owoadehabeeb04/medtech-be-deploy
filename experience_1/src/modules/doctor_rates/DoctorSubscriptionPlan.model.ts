import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "doctor_subscription_plans",
	timestamps: true,
	indexes: [
		{
			name: "doctor_subscription_plans_doctor_id_is_active_sort_order_idx",
			fields: ["doctor_id", "is_active", "sort_order"],
		},
	],
})
export class DoctorSubscriptionPlan extends Model<DoctorSubscriptionPlan> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare doctorId: number;

	@BelongsTo(() => User)
	declare doctor: User;

	@Column(DataType.STRING)
	declare title: string;

	@Column(DataType.INTEGER)
	declare amountKobo: number;

	@Column(DataType.INTEGER)
	declare durationDays: number;

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@Default(0)
	@Column(DataType.INTEGER)
	declare sortOrder: number;
}
