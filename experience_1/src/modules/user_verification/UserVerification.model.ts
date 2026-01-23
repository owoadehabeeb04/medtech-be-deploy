import { AllowNull, Column, DataType, Default, Model, Table } from "sequelize-typescript";
import { CreateOTPDTO } from "./UserVerification.dto";

@Table({
	tableName: "user_verifications",
	timestamps: true,
})
export class UserVerification extends Model<UserVerification> {
	@AllowNull(true)
	@Column(DataType.STRING)
	declare otp: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare sessionId: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare phoneNumber: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare email: string;

	@AllowNull(true)
	@Column(DataType.STRING)
	declare userType: string;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	declare validated: boolean;

	@AllowNull(false)
	@Column(DataType.STRING)
	declare path: string;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@AllowNull(false)
	@Column(DataType.DATE)
	declare expiresAt: Date;

	static async setSession(data: CreateOTPDTO, otpExpiration: number = 1): Promise<UserVerification> {
		const otpExpiresAt = new Date(Date.now() + otpExpiration * 60 * 1000);

		// Deactivate old active OTPs for the same phone number
		await this.update({ isActive: false }, { where: { phoneNumber: data.phoneNumber, isActive: true } });

		return this.create({
			otp: data.otp,
			sessionId: data.sessionId,
			phoneNumber: data.phoneNumber,
			email: data.email,
			userType: data.userType,
			validated: false,
			path: data.path,
			isActive: true,
			expiresAt: otpExpiresAt,
		});
	}

	static async getSession(sessionId: string): Promise<UserVerification | null> {
		return this.findOne({
			where: { sessionId, isActive: true },
		});
	}

	static async delSession(sessionId: string): Promise<[affectedCount: number]> {
		return this.update(
			{ isActive: false },
			{
				where: { sessionId, isActive: true },
			}
		);
	}

	static async validateOTP(sessionId: string, otp: string): Promise<boolean> {
		const record = await this.findOne({
			where: { sessionId, otp, isActive: true },
		});
		if (!record) return false;

		// Check expiry
		if (record.expiresAt.getTime() < Date.now()) {
			record.isActive = false;
			await record.save();
			return false; // expired
		}

		record.validated = true;
		record.otp = null
		await record.save();
		return true;
	}

	// static async updateSession(sessionId: string, data: Partial<CreateOTPDTO>) {
	// 	const [updated] = await this.update({ ...data }, { where: { sessionId }, returning: true });

	// 	if (!updated) throw new Error(`Session ${sessionId} not found`);

	// 	return this.findOne({ where: { sessionId } });
	// }

	static async updateSession(sessionId: string, data: Partial<CreateOTPDTO>) {
	const [updated] = await this.update(
		{ ...data },
		{ where: { sessionId, isActive: true }, returning: true }
	);

	if (!updated) throw new Error(`Session ${sessionId} not found`);

	return this.findOne({ where: { sessionId, isActive: true } });
}

}
