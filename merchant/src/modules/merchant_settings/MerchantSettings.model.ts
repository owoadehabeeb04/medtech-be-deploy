import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
} from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";

@Table({
  tableName: "merchant_settings",
  timestamps: true,
})
export class MerchantSettings extends Model<MerchantSettings> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Merchant)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare merchantId: string;

  @BelongsTo(() => Merchant)
  declare merchant: Merchant;

  // Notification Settings
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare pushNotificationsEnabled: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare emailNotificationsEnabled: boolean;

  @AllowNull(false)
  @Default({
    orderPlaced: { email: false, sms: false, desktop: true },
    walletFunded: { email: false, sms: false, desktop: true },
    offlineSaleRecorded: { email: false, sms: false, desktop: true },
    lowStock: { email: false, sms: false, desktop: true },
    payoutAlert: { email: false, sms: false, desktop: true },
    supportTicket: { email: false, sms: false, desktop: true },
  })
  @Column(DataType.JSONB)
  declare notificationPreferences: {
    orderPlaced: { email: boolean; sms: boolean; desktop: boolean };
    walletFunded: { email: boolean; sms: boolean; desktop: boolean };
    offlineSaleRecorded: { email: boolean; sms: boolean; desktop: boolean };
    lowStock: { email: boolean; sms: boolean; desktop: boolean };
    payoutAlert: { email: boolean; sms: boolean; desktop: boolean };
    supportTicket: { email: boolean; sms: boolean; desktop: boolean };
  };

  // Store Preferences
  @AllowNull(false)
  @Default({
    acceptOrdersAutomatically: true,
    requireManualApprovalForPrescriptions: false,
    allowOutOfStockAlternatives: false,
    autoHideOutOfStock: false,
    enablePharmacyPickup: true,
    enableInHouseDelivery: false,
    deliveryRadius: null,
    deliveryFeeType: "flat",
    deliveryFlatFee: null,
    deliveryPricePerKm: null,
    deliveryStartTime: null,
    deliveryEndTime: null,
    lowStockThreshold: 5,
    showLowStockLabel: false,
  })
  @Column(DataType.JSONB)
  declare storePreferences: {
    acceptOrdersAutomatically: boolean;
    requireManualApprovalForPrescriptions: boolean;
    allowOutOfStockAlternatives: boolean;
    autoHideOutOfStock: boolean;
    enablePharmacyPickup: boolean;
    enableInHouseDelivery: boolean;
    deliveryRadius: number | null;
    deliveryFeeType: "flat" | "distance-based";
    deliveryFlatFee: number | null;
    deliveryPricePerKm: number | null;
    deliveryStartTime: string | null;
    deliveryEndTime: string | null;
    lowStockThreshold: number;
    showLowStockLabel: boolean;
  };
}
