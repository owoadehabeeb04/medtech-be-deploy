import { OauthStrategy } from "./Oauth.strategy";
import { GoogleOauth } from "./Google.oauth";

export class OAuthService {
	private strategy: OauthStrategy;

	constructor(provider: string) {
		switch (provider) {
			case "google":
				this.strategy = new GoogleOauth();
				break;
			case "facebook":
				// this.strategy = new FacebookOAuthStrategy();
				break;
			case "apple":
				// this.strategy = new AppleOAuthStrategy();
				break;
			default:
				throw new Error("Unsupported OAuth provider");
		}
	}

	async authenticate(code: string, userType: string): Promise<any> {
		return this.strategy.authenticate(code, userType);
	}

	generateAuthUrl(): string {
		return this.strategy.generateAuthUrl();
	}
}
