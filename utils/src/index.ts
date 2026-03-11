import * as handlebars from "handlebars";
import moment from "moment";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import * as path from "path";
const fs = require("fs");

export function add(a: number, b: number): number {
	return a + b;
}

export const capitalize = (str: string): string => {
	str = String(str).trim();
	if (str) {
		return str
			.split(" ")
			.filter((word) => word !== "")
			.map((word) => {
				let string = word.toLowerCase();
				const cap = string[0].toString().toUpperCase();

				string = cap + string.slice(1);
				return string;
			})
			.join(" ");
	}

	return str;
};

export const formatPhone = (phone: string): string => {
	phone = String(phone).trim();
	phone = phone.substring(phone.length - 10);
	phone = "0" + phone;
	return phone;
};

export const formatPhoneCode = (dialCode: string, phone: string): string => {
	phone = String(phone).trim();
	dialCode = String(dialCode).trim();
	phone = phone.substring(phone.length - 10);
	return dialCode + phone;
};

export function formatPhoneTenDigits(phoneNumber: string) {
	const lastTenDigits = phoneNumber.substring(Math.max(0, phoneNumber.length - 10));
	return lastTenDigits;
}

export const tokey = (str: string): string => {
	str = String(str).trim();
	if (str) {
		return str
			.split(" ")
			.filter((word) => word !== "")
			.map((word) => {
				return word.toUpperCase();
			})
			.join("_");
	}

	return str;
};

export const pagination = (data: Object[], limit: number, page: number, total: number): any => {
	let totalPages = Math.ceil(total / limit);

	const nextPage = data.length > 0 && page !== totalPages ? page + 1 : null;
	const prevPage = data.length > 0 && page > 1 ? page - 1 : null;

	let to = !nextPage ? total : page * data.length;
	let from = to - data.length + 1;

	return { data, total, limit, page, totalPages, nextPage, prevPage, to, from };
};

export const sEI = (init_code: string, code: string): string => {
	return `${init_code}${code}`;
};
export const genRandomNumber = (length: number) => {
	return Math.random().toString().substring(2).substring(0, length);
};

export const genAlphaNum = (length: number) => {
	let result = "";
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
};


export const checkPermissions = (assignedPermissions: any[], permissions: string[]) => {
	if (permissions.length === 0 || assignedPermissions.length === 0) {
		return false;
	}

	return permissions.every((value) => {
		return assignedPermissions.includes(value);
	});
};

export const checkPermissions__ = (assignedPermissions: any[], permissions: string[]) => {
	if (permissions.length === 0 || assignedPermissions.length === 0) {
		return false;
	}

	return permissions.every((value) => {
		return assignedPermissions.includes(value);
	});
};

export const getArrObjByKey = (arr: any[], key: any, value: any): Object | null => {
	const search = arr.find((element) => element[key] === value);
	return search;
};

export const removeHtmlTags = (str: string) => {
	if (str === null || str === "") return false;
	else str = str.toString();
	return str.replace(/(<([^>]+)>)/gi, "");
};

export const sortByKey = async (array: any[], key: string) => {
	return await Promise.all(
		array.sort(function (a, b) {
			const x = a[key],
				y = b[key];
			return x < y ? -1 : x > y ? 1 : 0;
		}),
	);
};

export const toBase64 = (path: string) => {
	const bitmap = fs.readFileSync(path);
	return bitmap.toString("base64");
};

export const isEmail = (email: any) => {
	let re = /\S+@\S+\.\S+/;
	return re.test(email);
};

export const isAlpha = (str: string) => {
	return /[a-zA-Z]/.test(str);
};

export const separateAlphaNumeric = (str: string) => {
	const match = str.match(/^([a-zA-Z]+)(\d+)/);
	if (match) {
		const alpha = match[1];
		const numeric = match[2];
		return { alpha, numeric };
	} else {
		return { alpha: "", numeric: "" };
	}
};

export const renderTemplate = (templatePath: string, data: any): string => {
	const template = fs.readFileSync(templatePath, "utf8");
	const compiledTemplate = handlebars.compile(template);
	return compiledTemplate(data);
};

export const base64ToBuffer = async (base64: string): Promise<Buffer> => {
	try {
		const buffer = Buffer.from(base64, "base64");
		if (!buffer.length) {
			throw new Error("Invalid base64 data");
		}
		return buffer;
	} catch (error) {
		console.log("base64ToBuffer__");
		throw error;
	}
};

export const split_name = (name: string) => {
	let firstName, middleName, lastName;
	let result: any = {};

	const nameArray = name.split(" ");

	firstName = nameArray[0];

	if (nameArray.length > 2) {
		middleName = nameArray[1];
		lastName = nameArray[2];
	} else {
		lastName = nameArray.pop();
	}

	if (nameArray.length > 2) {
		result = { firstName, middleName, lastName };
	} else {
		result = { firstName, lastName };
	}

	return result;
};

export function isTimestampValid(timestamp: string) {
	const receivedMoment = moment(timestamp);
	if (!receivedMoment.isValid()) {
		return false;
	}
	return true;
}

export const maskPhone = (str: string, visibleStart = 3, visibleEnd = 4): string => {
	if (!str) return str;
	const length = str.length;
	if (length <= visibleStart + visibleEnd) {
		return str;
	}

	const prefix = str.substring(0, visibleStart);
	const suffix = str.substring(length - visibleEnd);
	const maskedSection = "*".repeat(length - (visibleStart + visibleEnd));

	return `${prefix}${maskedSection}${suffix}`;
};

export const maskEmail = (email: string) => {
	if (email) {
		email = email.toString().trim().toLowerCase();
		const [name, domain] = email.split("@");
		const { length: len } = name;
		const maskedName = name[0] + "*******" + name[len - 1];
		const maskedEmail = maskedName + "@" + domain;
		return maskedEmail;
	}

	return null;
};

export const checkArrayData = (obj: Object) => obj && Array.isArray(obj) && obj.length > 0;

export const checkArray = (obj: Object) => obj && Array.isArray(obj);

export const errorCode = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
};

export default class CustomError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number = 500) {
		super(message);
		this.statusCode = statusCode;
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}

	static manageApplicationErrors(error: any) {
		if (error instanceof CustomError) {
			return error;
		}
		// Check if error has statusCode property, use it; otherwise default to 500
		const statusCode = error.statusCode || 500;
		return new CustomError(error.message || "Internal Server Error", statusCode);
	}
}

export class HttpException extends Error {
	statusCode: number;
	message: string;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
		this.message = message;
	}
}

export const getMomentStartAndEndDate = (date: "today" | "yesterday" | "last_7_days" | "this_month" | "last_month") => {
	let startDate: moment.Moment;
	let endDate: moment.Moment;

	switch (date) {
		case "today":
			startDate = moment().startOf("day");
			endDate = moment().endOf("day");
			break;
		case "yesterday":
			startDate = moment().subtract(1, "day").startOf("day");
			endDate = moment().subtract(1, "day").endOf("day");
			break;
		case "last_7_days":
			startDate = moment().subtract(6, "days").startOf("day");
			endDate = moment().endOf("day");
			break;
		case "this_month":
			startDate = moment().startOf("month");
			endDate = moment().endOf("month");
			break;
		case "last_month":
			startDate = moment().subtract(1, "month").startOf("month");
			endDate = moment().subtract(1, "month").endOf("month");
			break;
		default:
			break;
	}

	return { startDate, endDate };
};

export const cleanString = (str: string) => {
	str = str.replace(/[^a-zA-Z0-9]/g, "");
	return str.replace(/\?/g, "");
};

export const allowHyphen = (str: string) => {
	return str.replace(/[^a-zA-Z0-9-]/g, "");
};

export function encodeHTMLEntities(str: string) {
	return str.replace(/[\u00A0-\u9999<>&"']/g, function (c) {
		return "&#" + c.charCodeAt(0) + ";";
	});
}
export function sanitizeBody<T extends Record<string, any>>(body: T): T {
	const cleanedBody = {} as T;
	for (const key in body) {
		if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
		if (typeof body[key] === "string") {
			// Trim whitespace and remove dangerous HTML characters only
			cleanedBody[key] = (body[key] as string)
				.trim()
				.replace(/[<>"']/g, "") as any;
		} else if (typeof body[key] === "object" && body[key] !== null && !Array.isArray(body[key])) {
			// Recursively sanitize nested objects
			cleanedBody[key] = sanitizeBody(body[key]);
		} else {
			cleanedBody[key] = body[key];
		}
	}
	return cleanedBody;
}

export function sanitizeBody2<T extends Record<string, any>>(body: T): T {
	const cleanedBody = {} as T;
	for (const key in body) {
		if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
		if (typeof body[key] === "string") {
			// Trim whitespace and remove dangerous HTML characters only
			cleanedBody[key] = (body[key] as string)
				.trim()
				.replace(/[<>"']/g, "") as any;
		} else if (typeof body[key] === "object" && body[key] !== null && !Array.isArray(body[key])) {
			// Recursively sanitize nested objects
			cleanedBody[key] = sanitizeBody2(body[key]);
		} else {
			cleanedBody[key] = body[key];
		}
	}
	return cleanedBody;
}

export function removeExistingKeys<T extends object>(obj: T, keysToRemove: (keyof T)[]): Omit<T, keyof T> {
	const result = { ...obj };
	for (const key of keysToRemove) {
		if (key in result) {
			delete (result as any)[key];
		}
	}
	return result as Omit<T, keyof T>;
}

export const hashPassword = async (password: string): Promise<string> => {
	const saltRounds = 10;
	return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
	return bcrypt.compare(password, hash);
};

export const encryptWithPassword = (data: string, password: string): string => {
	const algorithm = "aes-256-cbc";
	const key = crypto.scryptSync(password, "salt", 32);
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	let encrypted = cipher.update(data, "utf8", "hex");
	encrypted += cipher.final("hex");
	return iv.toString("hex") + ":" + encrypted;
};

export const sanitizeInput = (input: string): string => {
	return input.trim().replace(/[<>]/g, "");
};

export const validateSchema = (schema: Joi.Schema, data: any): { error: string | null; value: any } => {
	const { error, value } = schema.validate(data, { abortEarly: false });
	if (error) {
		return {
			error: error.details.map((d) => d.message).join(", "),
			value: undefined as any,
		};
	}
	return { error: null, value };
};

export async function manageAsyncOps<T>(
	promise: Promise<T>
): Promise<[Error | null, T | null]> {
	try {
		const data = await promise;
		return [null, data];
	} catch (error) {
		return [error as Error, null];
	}
}

export const generateOTP = (length: number = 4): string => {
	return Math.random()
		.toString()
		.substring(2, 2 + length)
		.padStart(length, "0");
};

export const generateUUID = (): string => {
	return uuidv4();
};

export const splitOTPDigits = (otp: string): string[] => {
	return otp.split("");
};

export function deepMerge<T = any>(target: T, source: Partial<T>): T {
	if (!source) return target;
	if (!target) return source as T;
	const output = { ...target } as any;
	for (const key in source) {
		const sourceValue = source[key];
		const targetValue = (target as any)[key];
		if (
			sourceValue &&
			typeof sourceValue === "object" &&
			!Array.isArray(sourceValue) &&
			targetValue &&
			typeof targetValue === "object" &&
			!Array.isArray(targetValue)
		) {
			output[key] = deepMerge(targetValue, sourceValue);
		} else if (sourceValue !== undefined) {
			output[key] = sourceValue;
		}
	}
	return output as T;
}

const storage = multer.memoryStorage();

const uploadFiles = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowedTypes = /jpeg|jpg|png|pdf|svg/;
		const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = allowedTypes.test(file.mimetype);
		if (mimetype && extname) {
			return cb(null, true);
		} else {
			cb(new Error("Invalid file type. Only JPEG, JPG, PNG, PDF, SVG are allowed."));
		}
	},
});

export const uploadLicenseMiddleware: any = uploadFiles.single("license");

export {
	generateToken,
	generateOTPFlowToken,
	verifyToken,
	verifyOTPFlowToken,
	generateRefreshToken,
	verifyRefreshToken,
	type JWTPayload,
	type OTPFlowPayload,
	type RefreshTokenPayload,
	type JWTConfig,
} from "./jwt";

export { default as AwsUtil_s3, type AWSConfig, type IAWS } from "./aws.s3";
export { default as SendEmail, type BrevoConfig } from "./SendEmail";
