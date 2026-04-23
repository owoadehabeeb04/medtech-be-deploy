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
import { DrugstoreCart } from "./DrugstoreCart.model";

@Table({
	tableName: "drugstore_prescriptions",
	timestamps: true,
	indexes: [
		{ fields: ["user_id"] },
		{ fields: ["merchant_id"] },
		{ fields: ["cart_id"] },
		{ fields: ["status"] },
	],
})
export class DrugstorePrescription extends Model<DrugstorePrescription> {
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@ForeignKey(() => DrugstoreCart)
	@AllowNull(true)
	@Column(DataType.UUID)
	declare cartId: string | null;

	@BelongsTo(() => DrugstoreCart)
	declare cart: DrugstoreCart;

	@AllowNull(false)
	@Column(DataType.UUID)
	declare merchantId: string;

	@AllowNull(true)
	@Column(DataType.UUID)
	declare orderId: string | null;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare fileUrl: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare fileKey: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare fileName: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare fileMimeType: string;

	@AllowNull(true)
	@Column(DataType.INTEGER)
	declare fileSize: number | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare patientName: string | null;

	@AllowNull(true)
	@Column(DataType.DATEONLY)
	declare prescriptionDate: string | null;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isForSelf: boolean;

	@AllowNull(false)
	@Default("uploaded")
	@Column(DataType.ENUM("uploaded", "submitted", "needs_clarification", "approved", "rejected"))
	declare status: "uploaded" | "submitted" | "needs_clarification" | "approved" | "rejected";

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare merchantNote: string | null;

	@AllowNull(true)
	@Column(DataType.UUID)
	declare reviewedByMerchantId: string | null;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare reviewedByMerchantName: string | null;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare submittedAt: Date | null;

	@AllowNull(true)
	@Column(DataType.DATE)
	declare reviewedAt: Date | null;
}
