import { Request } from "express";
import { User } from "../../users/User.model";
import { SignupDTO } from "../UserAuth.dto";

export interface AuthStrategy {
	login(user: User, password: string): Promise<any>;
	signup(data: SignupDTO, req?: Request): Promise<any>;
	setPassword(user: User, password: string): Promise<any>;
}
