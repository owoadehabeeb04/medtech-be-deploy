import moment from "moment";
import Joi from "joi";
export declare function add(a: number, b: number): number;
export declare const capitalize: (str: string) => string;
export declare const formatPhone: (phone: string) => string;
export declare const formatPhoneCode: (dialCode: string, phone: string) => string;
export declare function formatPhoneTenDigits(phoneNumber: string): string;
export declare const tokey: (str: string) => string;
export declare const pagination: (data: Object[], limit: number, page: number, total: number) => any;
export declare const sEI: (init_code: string, code: string) => string;
export declare const genRandomNumber: (length: number) => string;
export declare const genAlphaNum: (length: number) => string;
export declare const checkPermissions: (assignedPermissions: any[], permissions: string[]) => boolean;
export declare const checkPermissions__: (assignedPermissions: any[], permissions: string[]) => boolean;
export declare const getArrObjByKey: (arr: any[], key: any, value: any) => Object | null;
export declare const removeHtmlTags: (str: string) => string | false;
export declare const sortByKey: (array: any[], key: string) => Promise<any[]>;
export declare const toBase64: (path: string) => any;
export declare const isEmail: (email: any) => boolean;
export declare const isAlpha: (str: string) => boolean;
export declare const separateAlphaNumeric: (str: string) => {
    alpha: string;
    numeric: string;
};
export declare const renderTemplate: (templatePath: string, data: any) => string;
export declare const base64ToBuffer: (base64: string) => Promise<Buffer>;
export declare const split_name: (name: string) => any;
export declare function isTimestampValid(timestamp: string): boolean;
export declare const maskPhone: (str: string, visibleStart?: number, visibleEnd?: number) => string;
export declare const maskEmail: (email: string) => string;
export declare const checkArrayData: (obj: Object) => boolean;
export declare const checkArray: (obj: Object) => boolean;
export declare const errorCode: {
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    INTERNAL_SERVER_ERROR: number;
};
export default class CustomError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
    static manageApplicationErrors(error: any): CustomError;
}
export declare class HttpException extends Error {
    statusCode: number;
    message: string;
    constructor(statusCode: number, message: string);
}
export declare const getMomentStartAndEndDate: (date: "today" | "yesterday" | "last_7_days" | "this_month" | "last_month") => {
    startDate: moment.Moment;
    endDate: moment.Moment;
};
export declare const cleanString: (str: string) => string;
export declare const allowHyphen: (str: string) => string;
export declare function encodeHTMLEntities(str: string): string;
export declare function sanitizeBody<T extends Record<string, any>>(body: T): T;
export declare function sanitizeBody2<T extends Record<string, any>>(body: T): T;
export declare function removeExistingKeys<T extends object>(obj: T, keysToRemove: (keyof T)[]): Omit<T, keyof T>;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const encryptWithPassword: (data: string, password: string) => string;
export declare const sanitizeInput: (input: string) => string;
export declare const validateSchema: (schema: Joi.Schema, data: any) => {
    error: string | null;
    value: any;
};
export declare function manageAsyncOps<T>(promise: Promise<T>): Promise<[Error | null, T | null]>;
export declare const generateOTP: (length?: number) => string;
export declare const generateUUID: () => string;
export declare const splitOTPDigits: (otp: string) => string[];
export declare function deepMerge<T = any>(target: T, source: Partial<T>): T;
export declare const uploadLicenseMiddleware: any;
export { generateToken, generateOTPFlowToken, verifyToken, verifyOTPFlowToken, generateRefreshToken, verifyRefreshToken, type JWTPayload, type OTPFlowPayload, type RefreshTokenPayload, type JWTConfig, } from "./jwt";
export { default as AwsUtil_s3, type AWSConfig, type IAWS } from "./aws.s3";
export { default as SendEmail, type SMTPConfig } from "./SendEmail";
//# sourceMappingURL=index.d.ts.map