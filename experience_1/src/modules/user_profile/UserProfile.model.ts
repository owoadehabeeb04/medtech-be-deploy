import { Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";
import { Transaction } from "sequelize";

@Table({ tableName: "user_profiles", timestamps: true })
export class UserProfile extends Model<UserProfile> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;

	@Column(DataType.STRING)
	declare addressLine1: string;

	@Column(DataType.STRING)
	declare addressLine2: string;

	@Column(DataType.STRING)
	declare city: string;

	@Column(DataType.STRING)
	declare state: string;

	@Column(DataType.STRING)
	declare username: string;

	@Column(DataType.STRING)
	declare phoneNumber: string;

	@Column(DataType.DATE)
	declare dateOfBirth: Date;

	@Column(DataType.STRING)
	declare location: string;

	@Column(DataType.STRING)
	declare profileImage: string;

	@Column(DataType.BOOLEAN)
	declare profileCompleted: boolean;

	@Column(DataType.BOOLEAN)
	declare onboardingSkipped: boolean;

	@Column(DataType.JSONB)
	declare skippedSteps: string[];

	static async createProfile(userId: number, data: Partial<UserProfile>, transaction?: Transaction): Promise<UserProfile> {
		const existing = await UserProfile.findOne({ where: { userId }, transaction });
		if (existing) {
			return existing.update({ ...data }, { transaction });
		}

		return UserProfile.create(
			{
				userId,
				...data,
			},
			{ transaction }
		);
	}
}
