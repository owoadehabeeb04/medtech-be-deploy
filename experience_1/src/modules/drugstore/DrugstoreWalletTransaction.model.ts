import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	Model,
	PrimaryKey,
	Table,
	Unique,
} from "sequelize-typescript";
import { DrugstoreWallet } from "./DrugstoreWallet.model";

@Table({
	tableName: "drugstore_wallet_transactions",
	timestamps: true,
	indexes: [{ fields: ["wallet_id"] }],
})
export class DrugstoreWalletTransaction extends Model<DrugstoreWalletTransaction> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => DrugstoreWallet)
	@AllowNull(false)
	@Column(DataType.UUID)
	declare walletId: string;

	@BelongsTo(() => DrugstoreWallet)
	declare wallet: DrugstoreWallet;

	@AllowNull(false)
	@Column(DataType.ENUM("credit", "debit"))
	declare type: "credit" | "debit";

	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare amount: number; // kobo, always positive

	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare balanceAfter: number; // kobo

	@Unique(true)
	@AllowNull(false)
	@Column(DataType.STRING)
	declare reference: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare description: string | null;

	@AllowNull(true)
	@Column(DataType.UUID)
	declare orderId: string | null;
}
