import { ApiResponse } from "../../../utils/common.dto";

export interface OauthStrategy {
	authenticate(code: string, userType: string): Promise<ApiResponse>;
	generateAuthUrl(): string;
}
