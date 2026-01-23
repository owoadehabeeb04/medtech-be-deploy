import { NextFunction, Request, Response } from "express";
import * as handlebars from "handlebars";
import moment from "moment";
const fs = require("fs");
import { Schema } from "joi";
import CustomError from "./error";

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
	// Extract the last ten digits using substring
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
	//let from = (!nextPage ? ((to - data.length) + 1) : (to - limit) + 1);
	let from = to - data.length + 1;

	return { data, total, limit, page, totalPages, nextPage, prevPage, to, from };
};

export const sEI = (init_code: string, code: string): string => {
	return `${init_code}${code}`;
};

export const setError = (
	req: Request,
	res: Response,
	status = 500,
	{ code, message = "Seems something went wrong", error, other }: { code?: string; message?: string; other?: any; error?: Error | any }
): Response => {
	let response: Object = { message };
	if (error) response = { ...response, error };
	if (code) response = { ...response, code };
	if (other) response = { ...response, other };
	return res.status(status).json(response);
};

/* generate random number */
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

export const getPolicyAbbr = (policy_number: string) => {
	const regex = /^[A-Z]+/;
	const match = policy_number.match(regex);
	return match[0];
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
		})
	);
};

export const toBase64 = (path: string) => {
	// read binary data from file
	const bitmap = fs.readFileSync(path);
	// convert the binary data to base64 encoded string
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
		const alpha = match[1]; // Extract the alphabetic part
		const numeric = match[2]; // Extract the numeric part
		return { alpha, numeric };
	} else {
		// If no match is found, return empty strings
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
		//decode base64 string
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

	// Check if timestamp is valid (optional)
	if (!receivedMoment.isValid()) {
		return false;
	}

	return true;
}

export const maskPhone = (str: string, visibleStart = 3, visibleEnd = 4): string => {
	if (!str) return str;

	const length = str.length;

	// If the phone number is too short, return as-is
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

export const manageAsyncOps = async <T>(fn: T): Promise<[Error, Awaited<T>]> => {
	try {
		const response: Awaited<T> = await fn;
		return [null, response];
	} catch (err) {
		const error = err as Error;
		return [error, null];
	}
};

// export const validateSchema = (schema: Schema, payload: unknown, next: NextFunction) => {
// 	const { error, value } = schema.validate(payload);
// 	if (error) {
// 		console.log(error);
// 		return next(CustomError.manageApplicationErrors(error));
// 	}
// 	return value;
// };

export const validateSchema = (schema: Schema, payload: unknown, next: NextFunction) => {
	const { error, value } = schema.validate(payload, { abortEarly: false });

	if (error) {
		console.log(error);
		const fieldErrors: Record<string, string> = {};
		error.details.forEach((detail) => {
			const fieldName = detail.path.join(".");
			fieldErrors[fieldName] = detail.message;
		});

		// Use Joi's first error message as the main message, or join all if preferred
		const mainMessage = error.details.length === 1 ? error.details[0].message : `Validation failed: ${error.details.map((d) => d.message).join(", ")}`;

		next(
			CustomError.manageApplicationErrors({
				message: mainMessage,
				statusCode: 400,
				errorCode: "VALIDATION_ERROR",
				errors: fieldErrors,
			})
		);
		return null;
	}

	return value;
};

export const errorCode = (err_constant: string, code: string): string => {
	return `${sEI(err_constant, code)}`;
};

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
	// allow letters, numbers, and hyphen
	return str.replace(/[^a-zA-Z0-9-]/g, "");
};

export function encodeHTMLEntities(str: string) {
	return str.replace(/[\u00A0-\u9999<>&"']/g, function (c) {
		return "&#" + c.charCodeAt(0) + ";";
	});
}

/**
 * Cleans request body by removing non-alphanumeric characters
 * from string fields, except for exempted keys.
 *
 * @param body - The request body (e.g., req.body)
 * @param exemptKeys - Keys to skip cleaning
 * @returns A cleaned copy of the body
 */
export function sanitizeBody<T extends Record<string, any>>(body: T, exemptKeys: (keyof T)[] = []): T {
	const cleanedBody = {} as T;

	for (const key in body) {
		if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

		// Skip cleaning for exempted keys
		if (exemptKeys.includes(key as keyof T)) {
			cleanedBody[key] = body[key];
			continue;
		}

		// Clean only string values
		if (typeof body[key] === "string") {
			cleanedBody[key] = (body[key] as string).replace(/[^a-zA-Z0-9]/g, "") as any;
		} else {
			cleanedBody[key] = body[key];
		}
	}

	return cleanedBody;
}
export function parseEnvList(value?: string): string[] {
	return value ? value.split(",").map((v) => v.trim()) : [];
}

/**
 * Remove the given keys from an object **if they exist**.
 *
 * @param obj          The source object (not mutated)
 * @param keysToRemove An array of strings – only the ones that are real keys of `obj` are removed
 * @returns            A new object without those keys
 */
export function removeExistingKeys<T extends object>(obj: T, keysToRemove: (keyof T)[]): Omit<T, keyof T> {
	// Start with a shallow copy
	const result = { ...obj };

	// `key` is guaranteed to be a key of `T` → safe to delete
	for (const key of keysToRemove) {
		if (key in result) {
			delete (result as any)[key];
		}
	}

	return result as Omit<T, keyof T>;
}
