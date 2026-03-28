import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";
import { applicationConfig } from "../../config";
import * as bcrypt from "bcryptjs";
import { UserAuthDTO } from "./UserAuth.dto";
import { Transaction } from "sequelize";

@Table({
	tableName: "user_auths",
	timestamps: true,
})
export class UserAuth extends Model<UserAuth> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;
	@BelongsTo(() => User)
	declare user: User;

	@Column(DataType.STRING)
	declare identifier: string;

	@Column(DataType.STRING)
	declare password: string;

	@Column(DataType.STRING)
	declare refreshToken: string;

	@Column(DataType.STRING)
	declare oauthProvider: string;

	@Column(DataType.BOOLEAN)
	declare emailVerified: Boolean;

	@Column(DataType.STRING)
	declare oauthId: string;

	@Column(DataType.STRING)
	declare oauthAccessToken: string;

	@Column(DataType.STRING)
	declare oauthRefreshToken: string;

	@Column(DataType.DATE)
	declare oauthExpiryDate: Date;

	static async findById(id: number): Promise<UserAuth | null> {
		return await this.findByUserId(id);
	}

	static async findByUserId(userId: number): Promise<UserAuth | null> {
		return await this.findOne({ where: { userId } });
	}

	static async findByIdentifier(identifier: string): Promise<UserAuth | null> {
		return await this.findOne({ where: { identifier } });
	}

	static async getUserAuthByEmail(identifier: string): Promise<UserAuth | null> {
		return await this.findOne({ where: { identifier } });
	}

	static async createAuth(userId: number, identifier: string, password?: string): Promise<UserAuth> {
		return await this.create({ userId, identifier, password });
	}

	static async encryptPassword(password: string): Promise<string> {
		return await bcrypt.hash(password, applicationConfig.bcryptSaltRound);
	}

	static async validatePassword(plain: string, encrypted: string): Promise<boolean> {
		return await bcrypt.compare(plain, encrypted);
	}

	static async new(data: UserAuthDTO, transaction?: Transaction): Promise<UserAuth> {
		return await this.create(
			{
				userId: data.userId,
				identifier: data.identifier,
				password: data.password,
				refreshToken: data.refreshToken,
				emailVerified: data.emailVerified,
				oauthProvider: data.oauthProvider,
				oauthId: data.oauthId,
				oauthAccessToken: data.oauthAccessToken,
				oauthRefreshToken: data.oauthRefreshToken,
				oauthExpiryDate: data.oauthExpiryDate,
			},
			{ transaction }
		);
	}
}
