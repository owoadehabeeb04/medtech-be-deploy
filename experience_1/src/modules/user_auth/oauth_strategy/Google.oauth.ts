import { OauthStrategy } from "./Oauth.strategy";
import { ApiResponse } from "../../../utils/common.dto";
import { UserAuthService } from "../UserAuth.service";

/** Compatibility adapter: Google sign-in now uses a Firebase client ID token. */
export class GoogleOauth implements OauthStrategy {
	async authenticate(idToken: string, userType: string): Promise<ApiResponse> {
		return UserAuthService.googleLogin({ idToken, role: userType });
	}

	generateAuthUrl(): string {
		throw new Error("Start Google sign-in with the Firebase client SDK, then send its ID token to POST /auth/google.");
	}
}
