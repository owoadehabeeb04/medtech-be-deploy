import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "drugstore_saved_cards",
	timestamps: true,
	indexes: [
		{ fields: ["user_id"] },
		// Backs saveCardFromAuthorization's dedup check at the DB level — without this, two
		// concurrent confirmOrderPayment calls for the same card can both pass the app-level
		// "does this card already exist" check and both insert.
		{ unique: true, fields: ["user_id", "last4", "exp_month", "exp_year"] },
	],
})
export class DrugstoreSavedCard extends Model<DrugstoreSavedCard> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@AllowNull(false)
	@Column(DataType.TEXT)
	declare authorizationCodeCipher: string; // JSON-serialized { encrypted, iv, tag } — never expose or log

	@AllowNull(false)
	@Column(DataType.STRING(4))
	declare last4: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare cardType: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare bank: string | null;

	@AllowNull(true)
	@Column(DataType.STRING(2))
	declare expMonth: string | null;

	@AllowNull(true)
	@Column(DataType.STRING(4))
	declare expYear: string | null;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	declare isDefault: boolean;
}
