import { AllowNull, BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";
import { Op } from "sequelize";

@Table({
	tableName: "user_tokens",
	timestamps: true,
})
export class UserToken extends Model<UserToken> {
	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare userId: number;
	@BelongsTo(() => User, { targetKey: "id", foreignKey: "userId", onDelete: "SET NULL" })
	declare user: User;

	@Column(DataType.TEXT)
	declare accessToken: string;

	@Column(DataType.TEXT)
	declare refreshToken: string;

	static async setToken(userId: number, accessToken: string, refreshToken?: string): Promise<UserToken> {
		await this.destroy({ where: { userId } });
		return this.create({
			userId,
			accessToken,
			refreshToken,
		});
	}

	static async remove(accessToken: string): Promise<number> {
		return await this.destroy({
			where: { accessToken },
		});
	}

	static async findByAccessToken(accessToken: string): Promise<UserToken | null> {
		return this.findOne({ where: { accessToken } });
	}

	static async validateRefreshToken(refreshToken: string): Promise<User | null> {
		const token = await this.findOne({ where: { refreshToken } });
		if (!token) return null;
		return await User.findByPk(token.userId);
	}

	static async findByRefreshToken(refreshToken: string): Promise<UserToken | null> {
		return this.findOne({ where: { refreshToken } });
	}

	static async revokeByRefreshToken(refreshToken: string): Promise<number> {
		return this.destroy({ where: { refreshToken } });
	}

	static async revokeByUserId(userId: number): Promise<number> {
		return this.destroy({ where: { userId } });
	}

	static async revokeSession(accessToken: string, refreshToken?: string): Promise<number> {
		const where: any = { accessToken };
		if (refreshToken) {
			where[Op.or] = [{ accessToken }, { refreshToken }];
		}

		return this.destroy({ where });
	}
}
