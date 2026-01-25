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

	static async createProfile(userId: number, data: Partial<UserProfile>, transaction?: Transaction): Promise<UserProfile> {
		const profile = await UserProfile.create(
			{
				userId,
				...data,
			},
			{ transaction }
		);
		return profile;
	}
}
