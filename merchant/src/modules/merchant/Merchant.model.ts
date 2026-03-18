import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  Table,
  Unique,
  HasOne,
  HasMany,
  PrimaryKey,
} from "sequelize-typescript";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantSettings } from "../merchant_settings/MerchantSettings.model";
import { Product } from "../products/Product.model";
import { Discount } from "../discounts/Discount.model";
import { Category } from "../categories/Category.model";
import { RefreshToken } from "../refresh_tokens/RefreshToken.model";
import { Subscription } from "../subscriptions/Subscription.model";
import { Wallet } from "../wallet/Wallet.model";
import { Transaction } from "../transactions/Transaction.model";

@Table({
  tableName: "merchants",
  timestamps: true,
})
export class Merchant extends Model<Merchant> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare firstName: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare lastName: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare phoneNumber: string;

  @AllowNull(false)
  @Default("+234")
  @Column(DataType.STRING)
  declare phoneCountryCode: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare password: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare profilePictureUrl: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isVerified: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  // Onboarding fields
  @AllowNull(true)
  @Column(DataType.STRING)
  declare validIdUrl: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare onboardingCompleted: boolean;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  declare onboardingStep: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare onboardingCompletedAt: Date;

  // Associations
  @HasOne(() => StoreDetails)
  declare storeDetails: StoreDetails;

  @HasOne(() => PaymentDetails)
  declare paymentDetails: PaymentDetails;

  @HasOne(() => MerchantSettings)
  declare settings: MerchantSettings;

  @HasMany(() => Product)
  declare products: Product[];

  @HasMany(() => Discount)
  declare discounts: Discount[];

  @HasMany(() => Category)
  declare categories: Category[];

  @HasMany(() => RefreshToken)
  declare refreshTokens: RefreshToken[];

  @HasOne(() => Subscription)
  declare subscription: Subscription;

  @HasOne(() => Wallet)
  declare wallet: Wallet;

  @HasMany(() => Transaction)
  declare transactions: Transaction[];

  // Computed property for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
