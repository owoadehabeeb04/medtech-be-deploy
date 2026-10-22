import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

// A login for someone who works at one or more pharmacies but does not own one. People who own a
// pharmacy use their Merchant login and join other pharmacies through MerchantMember.ownerMerchantId.
@Table({
  tableName: "staff_accounts",
  timestamps: true,
})
export class StaffAccount extends Model<StaffAccount> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare password: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare firstName: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare lastName: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare phoneNumber: string | null;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
