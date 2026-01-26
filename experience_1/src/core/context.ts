import conneection from "./db";
import { errorCode, manageAsyncOps, sanitizeBody, validateSchema } from "../utils";
import CustomError from "../utils/error";
import { sanitizeInput } from "../utils/sanitize";
import { encryptWithPassword } from "../utils/encrypt";
import { applicationConfig } from "../config";
import { User } from "../modules/users/User.model";
// import { AppEventEmitter } from "../observers/eventEmitter";

const { encryption } = applicationConfig;

export interface AuthenticatedUser extends User {
	permissions: string[];
}

export const bootstrapRequestContext = async () => {
	const sequelize = await conneection();
	const token: string = null;
	const user: AuthenticatedUser = null;
	const files: any = null;
	const encrypter = (data: any) => (encryption.enabled ? encryptWithPassword(JSON.stringify(data), encryption.password) : data);

	return {
		sequelize,
		user,
		manageApplicationErrors: CustomError.manageApplicationErrors,
		manageAsyncOps,
		validateSchema,
		files,
		token,
		sanitizeInput,
		redis: {
			// rdbSetAuthSession: rdbSet__authSession,
			// rdbGetAuthSession: rdbGet__authSession,
			// rdbDelAuthSession: rdbDel__authSession,
		},
		// AppEventEmitter,
		errorCode: errorCode,
		encrypt: encrypter,
		sanitizeBody,
	};
};
