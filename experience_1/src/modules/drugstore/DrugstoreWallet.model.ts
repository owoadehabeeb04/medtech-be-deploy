import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "drugstore_wallets",
	timestamps: true,
})
export class DrugstoreWallet extends Model<DrugstoreWallet> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@Unique(true)
	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	declare balance: number; // kobo

	@AllowNull(false)
	@Default("NGN")
	@Column(DataType.STRING)
	declare currency: string;
}
