import { AllowNull, BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

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

	static async validateRefreshToken(refreshToken: string): Promise<User | null> {
		const token = await this.findOne({ where: { refreshToken } });
		if (!token) return null;
		return await User.findByPk(token.userId);
	}
}
