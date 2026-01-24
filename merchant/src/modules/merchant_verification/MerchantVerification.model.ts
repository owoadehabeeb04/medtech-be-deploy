import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  Table,
} from "sequelize-typescript";
import { hashPassword, verifyPassword } from "@medtech/utils";
@Table({
  tableName: "merchant_verifications",
  timestamps: true,
})
export class MerchantVerification extends Model<MerchantVerification> {
  @AllowNull(true)
  @Column(DataType.STRING)
  declare otp: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare sessionId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare name: string; // Store name from signup step

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare validated: boolean;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare path: string; // "signup" or "reset-password"

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;

  static async setSession(
    data: {
      otp: string;
      sessionId: string;
      email: string;
      path: string;
      name?: string;
    },
    otpExpirationMinutes: number = 10
  ): Promise<MerchantVerification> {
    const otpExpiresAt = new Date(Date.now() + otpExpirationMinutes * 60 * 1000);

    // Deactivate old active OTPs for the same email and path
    await this.update(
      { isActive: false },
      { where: { email: data.email, path: data.path, isActive: true } }
    );

    // Hash the OTP before storing
    const hashedOtp = await hashPassword(data.otp);

    return this.create({
      otp: hashedOtp,
      sessionId: data.sessionId,
      email: data.email,
      name: data.name || null,
      validated: false,
      path: data.path,
      isActive: true,
      expiresAt: otpExpiresAt,
    });
  }

  static async getSession(sessionId: string): Promise<MerchantVerification | null> {
    return this.findOne({
      where: { sessionId, isActive: true },
    });
  }

  static async getSessionByEmail(email: string, path: string): Promise<MerchantVerification | null> {
    return this.findOne({
      where: { email, path, isActive: true },
      order: [['createdAt', 'DESC']], // Get most recent
    });
  }

  static async delSession(sessionId: string): Promise<number> {
    const [affectedCount] = await this.update(
      { isActive: false },
      {
        where: { sessionId, isActive: true },
      }
    );
    return affectedCount;
  }

  static async validateOTP(sessionId: string, otp: string): Promise<boolean> {
    const record = await this.findOne({
      where: { sessionId, isActive: true },
    });

    if (!record) return false;

    // Check expiry
    if (record.expiresAt.getTime() < Date.now()) {
      record.isActive = false;
      await record.save();
      return false; // expired
    }

    // Verify the OTP by comparing hashed input with stored hash
    const isValidOtp = await verifyPassword(otp, record.otp);
    if (!isValidOtp) {
      return false;
    }

    record.validated = true;
    record.otp = ""; // Clear OTP after successful verification
    await record.save();
    return true;
  }
}
