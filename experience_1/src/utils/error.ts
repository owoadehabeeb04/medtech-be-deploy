
import { BAD_REQUEST } from "http-status";
import { applicationConfig } from "../config";


export type ApplicationError = {
	message: string;
	errorCode?: string;
	statusCode?: number;
	errors?: Record<string, string>;
};

const { isProduction } = applicationConfig;
export default class CustomError extends Error {
	statusCode: number;
	errors: Record<string, string>;
	errorCode?: string;

	constructor({ message, statusCode = BAD_REQUEST, errorCode, errors }: ApplicationError) {
		super(message);
		this.name = "CustomError";
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		this.errors = errors ?? {};

		Object.setPrototypeOf(this, new.target.prototype);
	}

	toJSON() {
		return {
			message: this.message,
			errorCode: this.errorCode,
			statusCode: this.statusCode,
			errors: isProduction ? undefined : this.errors,
		};
	}

	static manageApplicationErrors = (applicationError: ApplicationError): unknown => {
		return new this(applicationError);
	};
}

type ApplicationValidationError = {
	details: { message: string }[];
};

export class AppValidationError extends Error {
	constructor(message: string) {
		super(message);
	}

	static manageErrors = (error: ApplicationValidationError) => {
		return new this(error.details[0].message);
	};
}
