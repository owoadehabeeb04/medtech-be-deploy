import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull,
  Index,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";

@Table({
  tableName: "refresh_tokens",
  timestamps: true,
  indexes: [
    { fields: ["merchant_id"] },
    { fields: ["expires_at"] },
    { unique: true, fields: ["token"] },
  ],
})
export class RefreshToken extends Model<RefreshToken> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare token: string; // Hashed refresh token

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare deviceInfo: string; // Optional: device/browser info

  @AllowNull(true)
  @Column(DataType.STRING)
  declare ipAddress: string; // Optional: IP address

  // Timestamps
  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Check if token is expired
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Check if token is valid
  get isValid(): boolean {
    return this.isActive && !this.isExpired;
  }
}
