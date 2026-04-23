import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	Model,
	Table,
} from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({
	tableName: "drugstore_addresses",
	timestamps: true,
	indexes: [{ fields: ["user_id"] }, { fields: ["user_id", "is_default"] }],
})
export class DrugstoreAddress extends Model<DrugstoreAddress> {
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
	@Default("My Address")
	@Column(DataType.STRING)
	declare label: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare addressLine1: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare addressLine2: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare city: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare state: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare recipientName: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare recipientPhone: string;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	declare isDefault: boolean;

	@AllowNull(true)
	@Column(DataType.DECIMAL(10, 7))
	declare latitude: number | null;

	@AllowNull(true)
	@Column(DataType.DECIMAL(10, 7))
	declare longitude: number | null;
}
