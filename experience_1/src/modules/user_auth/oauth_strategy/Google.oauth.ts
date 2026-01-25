import { OauthStrategy } from "./Oauth.strategy";
import { applicationConfig } from "../../../config";
import { OAuth2Client } from "google-auth-library";
import { ApiResponse } from "../../../utils/common.dto";
import { UserAuth } from "../UserAuth.model";
import connection from "../../../core/db";
import { User } from "../../users/User.model";
import { OAUTH_PROVIDERS, USER_TYPE } from "../../../constants/constant";
import { UserAuthService } from "../UserAuth.service";
import { RESPONSE_MESSAGES } from "../../../constants/response";

const { googleOauthOption } = applicationConfig;
const { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI } = googleOauthOption!;

const client: OAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

export class GoogleOauth implements OauthStrategy {
	async authenticate(code: string, userType: string): Promise<ApiResponse> {
		if (!code) {
			return {
				status: false,
				code: 400,
				message: "Authorization code is missing",
			};
		}

		const { tokens } = await client.getToken(code as string);

		client.setCredentials(tokens);

		const ticket = await client.verifyIdToken({
			idToken: tokens?.id_token!,
			audience: GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();

		if (!payload) throw new Error("Invalid token payload");

		const { sub: googleId, email, name, email_verified, given_name, family_name, picture } = payload;

		let user = await User.findByEmail(email, userType);
		let ua: UserAuth | null = null;

		if (user) {
			ua = await UserAuth.findOne({ where: { identifier: email } });
		}

		if (!user) {
			const sequelize = await connection();
			const transaction = await sequelize.transaction();

			try {
				user = await User.create(
					{
						firstName: given_name,
						lastName: family_name,
						email: email,
						profilePicture: picture,
						userType: userType,
						isProfileComplete: false,
					},
					{ transaction }
				);

				const oauth_dt: any = {
					email,
					emailVerified: email_verified,
					oauthProvider: OAUTH_PROVIDERS.GOOGLE,
					oauthId: googleId,
					oauthAccessToken: tokens.access_token,
					oauthRefreshToken: tokens.refresh_token,
					oauthExpiryDate: new Date(tokens.expiry_date! ?? 0),
					userId: user.id,
				};

				await UserAuth.new(oauth_dt, transaction);

				await transaction.commit();
				//TODO: initiate an email notification
			} catch (error: any) {
				await transaction.rollback();
				console.log(error, "error____________________________");
				throw new Error("Error creating user account. Please try again later.");
			}
		} else {
			ua.oauthAccessToken = tokens?.access_token;
			ua.oauthRefreshToken = tokens?.refresh_token;
			ua.oauthExpiryDate = new Date(tokens?.expiry_date! ?? 0);
			await ua.save();
		}

		if (user.isProfileComplete) {
			const token = await UserAuthService.generateToken(user);

			return {
				status: true,
				code: 200,
				message: RESPONSE_MESSAGES.SUCCESSS,
				data: { user, token },
			};
		} else {
			//OTP

			return {
				status: true,
				code: 200,
				message: "Authentication successful",
				data: { user },
			};
		}
	}

	generateAuthUrl(): string {
		return client.generateAuthUrl({
			access_type: "offline",
			scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
		});
	}
}
