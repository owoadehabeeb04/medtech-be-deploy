import { Request } from "express";
import { USER_TYPE } from "../../../constants/constant";
import { User } from "../../users/User.model";
import { AuthStrategy } from "./Auth.strategy";
import { MedicAuthStrategy } from "./MedicAuth.strategy";
import { UserAuthStrategy } from "./UserAuthStrategy.strategy";
import { SignupDTO } from "../UserAuth.dto";

export class AuthContext {
	private strategy: AuthStrategy;

	constructor(userType: string) {
		switch (userType.toLowerCase()) {
			case USER_TYPE.CUSTOMER:
				this.strategy = new UserAuthStrategy();
				break;
			case USER_TYPE.MEDIC:
				this.strategy = new MedicAuthStrategy();
				break;
			// case USER_TYPE.ADMIN:
			//     this.strategy = new AdminAuthStrategy();
			//     break;
			// case USER_TYPE.VENDOR:
			//     this.strategy = new VendorAuthStrategy();
			//     break;
			default:
				throw new Error("Invalid user type");
		}
	}

	async login(user: User, password: string) {
		return this.strategy.login(user, password);
	}

	async signup(data: SignupDTO, req?: Request) {
		return this.strategy.signup(data, req);
	}

	async setPassword(user: User, password: string) {
		return this.strategy.setPassword(user, password);
	}
}
