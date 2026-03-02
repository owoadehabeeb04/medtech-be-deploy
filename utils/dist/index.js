"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendEmail = exports.AwsUtil_s3 = exports.verifyRefreshToken = exports.generateRefreshToken = exports.verifyOTPFlowToken = exports.verifyToken = exports.generateOTPFlowToken = exports.generateToken = exports.uploadLicenseMiddleware = exports.splitOTPDigits = exports.generateUUID = exports.generateOTP = exports.validateSchema = exports.sanitizeInput = exports.encryptWithPassword = exports.verifyPassword = exports.hashPassword = exports.allowHyphen = exports.cleanString = exports.getMomentStartAndEndDate = exports.HttpException = exports.errorCode = exports.checkArray = exports.checkArrayData = exports.maskEmail = exports.maskPhone = exports.split_name = exports.base64ToBuffer = exports.renderTemplate = exports.separateAlphaNumeric = exports.isAlpha = exports.isEmail = exports.toBase64 = exports.sortByKey = exports.removeHtmlTags = exports.getArrObjByKey = exports.checkPermissions__ = exports.checkPermissions = exports.genAlphaNum = exports.genRandomNumber = exports.sEI = exports.pagination = exports.tokey = exports.formatPhoneCode = exports.formatPhone = exports.capitalize = void 0;
exports.add = add;
exports.formatPhoneTenDigits = formatPhoneTenDigits;
exports.isTimestampValid = isTimestampValid;
exports.encodeHTMLEntities = encodeHTMLEntities;
exports.sanitizeBody = sanitizeBody;
exports.sanitizeBody2 = sanitizeBody2;
exports.removeExistingKeys = removeExistingKeys;
exports.manageAsyncOps = manageAsyncOps;
exports.deepMerge = deepMerge;
const handlebars = __importStar(require("handlebars"));
const moment_1 = __importDefault(require("moment"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const fs = require("fs");
function add(a, b) {
    return a + b;
}
const capitalize = (str) => {
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
exports.capitalize = capitalize;
const formatPhone = (phone) => {
    phone = String(phone).trim();
    phone = phone.substring(phone.length - 10);
    phone = "0" + phone;
    return phone;
};
exports.formatPhone = formatPhone;
const formatPhoneCode = (dialCode, phone) => {
    phone = String(phone).trim();
    dialCode = String(dialCode).trim();
    phone = phone.substring(phone.length - 10);
    return dialCode + phone;
};
exports.formatPhoneCode = formatPhoneCode;
function formatPhoneTenDigits(phoneNumber) {
    const lastTenDigits = phoneNumber.substring(Math.max(0, phoneNumber.length - 10));
    return lastTenDigits;
}
const tokey = (str) => {
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
exports.tokey = tokey;
const pagination = (data, limit, page, total) => {
    let totalPages = Math.ceil(total / limit);
    const nextPage = data.length > 0 && page !== totalPages ? page + 1 : null;
    const prevPage = data.length > 0 && page > 1 ? page - 1 : null;
    let to = !nextPage ? total : page * data.length;
    let from = to - data.length + 1;
    return { data, total, limit, page, totalPages, nextPage, prevPage, to, from };
};
exports.pagination = pagination;
const sEI = (init_code, code) => {
    return `${init_code}${code}`;
};
exports.sEI = sEI;
const genRandomNumber = (length) => {
    return Math.random().toString().substring(2).substring(0, length);
};
exports.genRandomNumber = genRandomNumber;
const genAlphaNum = (length) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
exports.genAlphaNum = genAlphaNum;
const checkPermissions = (assignedPermissions, permissions) => {
    if (permissions.length === 0 || assignedPermissions.length === 0) {
        return false;
    }
    return permissions.every((value) => {
        return assignedPermissions.includes(value);
    });
};
exports.checkPermissions = checkPermissions;
const checkPermissions__ = (assignedPermissions, permissions) => {
    if (permissions.length === 0 || assignedPermissions.length === 0) {
        return false;
    }
    return permissions.every((value) => {
        return assignedPermissions.includes(value);
    });
};
exports.checkPermissions__ = checkPermissions__;
const getArrObjByKey = (arr, key, value) => {
    const search = arr.find((element) => element[key] === value);
    return search;
};
exports.getArrObjByKey = getArrObjByKey;
const removeHtmlTags = (str) => {
    if (str === null || str === "")
        return false;
    else
        str = str.toString();
    return str.replace(/(<([^>]+)>)/gi, "");
};
exports.removeHtmlTags = removeHtmlTags;
const sortByKey = (array, key) => __awaiter(void 0, void 0, void 0, function* () {
    return yield Promise.all(array.sort(function (a, b) {
        const x = a[key], y = b[key];
        return x < y ? -1 : x > y ? 1 : 0;
    }));
});
exports.sortByKey = sortByKey;
const toBase64 = (path) => {
    const bitmap = fs.readFileSync(path);
    return bitmap.toString("base64");
};
exports.toBase64 = toBase64;
const isEmail = (email) => {
    let re = /\S+@\S+\.\S+/;
    return re.test(email);
};
exports.isEmail = isEmail;
const isAlpha = (str) => {
    return /[a-zA-Z]/.test(str);
};
exports.isAlpha = isAlpha;
const separateAlphaNumeric = (str) => {
    const match = str.match(/^([a-zA-Z]+)(\d+)/);
    if (match) {
        const alpha = match[1];
        const numeric = match[2];
        return { alpha, numeric };
    }
    else {
        return { alpha: "", numeric: "" };
    }
};
exports.separateAlphaNumeric = separateAlphaNumeric;
const renderTemplate = (templatePath, data) => {
    const template = fs.readFileSync(templatePath, "utf8");
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
};
exports.renderTemplate = renderTemplate;
const base64ToBuffer = (base64) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const buffer = Buffer.from(base64, "base64");
        if (!buffer.length) {
            throw new Error("Invalid base64 data");
        }
        return buffer;
    }
    catch (error) {
        console.log("base64ToBuffer__");
        throw error;
    }
});
exports.base64ToBuffer = base64ToBuffer;
const split_name = (name) => {
    let firstName, middleName, lastName;
    let result = {};
    const nameArray = name.split(" ");
    firstName = nameArray[0];
    if (nameArray.length > 2) {
        middleName = nameArray[1];
        lastName = nameArray[2];
    }
    else {
        lastName = nameArray.pop();
    }
    if (nameArray.length > 2) {
        result = { firstName, middleName, lastName };
    }
    else {
        result = { firstName, lastName };
    }
    return result;
};
exports.split_name = split_name;
function isTimestampValid(timestamp) {
    const receivedMoment = (0, moment_1.default)(timestamp);
    if (!receivedMoment.isValid()) {
        return false;
    }
    return true;
}
const maskPhone = (str, visibleStart = 3, visibleEnd = 4) => {
    if (!str)
        return str;
    const length = str.length;
    if (length <= visibleStart + visibleEnd) {
        return str;
    }
    const prefix = str.substring(0, visibleStart);
    const suffix = str.substring(length - visibleEnd);
    const maskedSection = "*".repeat(length - (visibleStart + visibleEnd));
    return `${prefix}${maskedSection}${suffix}`;
};
exports.maskPhone = maskPhone;
const maskEmail = (email) => {
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
exports.maskEmail = maskEmail;
const checkArrayData = (obj) => obj && Array.isArray(obj) && obj.length > 0;
exports.checkArrayData = checkArrayData;
const checkArray = (obj) => obj && Array.isArray(obj);
exports.checkArray = checkArray;
exports.errorCode = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};
class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    static manageApplicationErrors(error) {
        if (error instanceof CustomError) {
            return error;
        }
        // Check if error has statusCode property, use it; otherwise default to 500
        const statusCode = error.statusCode || 500;
        return new CustomError(error.message || "Internal Server Error", statusCode);
    }
}
exports.default = CustomError;
class HttpException extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
    }
}
exports.HttpException = HttpException;
const getMomentStartAndEndDate = (date) => {
    let startDate;
    let endDate;
    switch (date) {
        case "today":
            startDate = (0, moment_1.default)().startOf("day");
            endDate = (0, moment_1.default)().endOf("day");
            break;
        case "yesterday":
            startDate = (0, moment_1.default)().subtract(1, "day").startOf("day");
            endDate = (0, moment_1.default)().subtract(1, "day").endOf("day");
            break;
        case "last_7_days":
            startDate = (0, moment_1.default)().subtract(6, "days").startOf("day");
            endDate = (0, moment_1.default)().endOf("day");
            break;
        case "this_month":
            startDate = (0, moment_1.default)().startOf("month");
            endDate = (0, moment_1.default)().endOf("month");
            break;
        case "last_month":
            startDate = (0, moment_1.default)().subtract(1, "month").startOf("month");
            endDate = (0, moment_1.default)().subtract(1, "month").endOf("month");
            break;
        default:
            break;
    }
    return { startDate, endDate };
};
exports.getMomentStartAndEndDate = getMomentStartAndEndDate;
const cleanString = (str) => {
    str = str.replace(/[^a-zA-Z0-9]/g, "");
    return str.replace(/\?/g, "");
};
exports.cleanString = cleanString;
const allowHyphen = (str) => {
    return str.replace(/[^a-zA-Z0-9-]/g, "");
};
exports.allowHyphen = allowHyphen;
function encodeHTMLEntities(str) {
    return str.replace(/[\u00A0-\u9999<>&"']/g, function (c) {
        return "&#" + c.charCodeAt(0) + ";";
    });
}
function sanitizeBody(body) {
    const cleanedBody = {};
    for (const key in body) {
        if (!Object.prototype.hasOwnProperty.call(body, key))
            continue;
        if (typeof body[key] === "string") {
            // Trim whitespace and remove dangerous HTML characters only
            cleanedBody[key] = body[key]
                .trim()
                .replace(/[<>"']/g, "");
        }
        else if (typeof body[key] === "object" && body[key] !== null && !Array.isArray(body[key])) {
            // Recursively sanitize nested objects
            cleanedBody[key] = sanitizeBody(body[key]);
        }
        else {
            cleanedBody[key] = body[key];
        }
    }
    return cleanedBody;
}
function sanitizeBody2(body) {
    const cleanedBody = {};
    for (const key in body) {
        if (!Object.prototype.hasOwnProperty.call(body, key))
            continue;
        if (typeof body[key] === "string") {
            // Trim whitespace and remove dangerous HTML characters only
            cleanedBody[key] = body[key]
                .trim()
                .replace(/[<>"']/g, "");
        }
        else if (typeof body[key] === "object" && body[key] !== null && !Array.isArray(body[key])) {
            // Recursively sanitize nested objects
            cleanedBody[key] = sanitizeBody2(body[key]);
        }
        else {
            cleanedBody[key] = body[key];
        }
    }
    return cleanedBody;
}
function removeExistingKeys(obj, keysToRemove) {
    const result = Object.assign({}, obj);
    for (const key of keysToRemove) {
        if (key in result) {
            delete result[key];
        }
    }
    return result;
}
const hashPassword = (password) => __awaiter(void 0, void 0, void 0, function* () {
    const saltRounds = 10;
    return bcryptjs_1.default.hash(password, saltRounds);
});
exports.hashPassword = hashPassword;
const verifyPassword = (password, hash) => __awaiter(void 0, void 0, void 0, function* () {
    return bcryptjs_1.default.compare(password, hash);
});
exports.verifyPassword = verifyPassword;
const encryptWithPassword = (data, password) => {
    const algorithm = "aes-256-cbc";
    const key = crypto_1.default.scryptSync(password, "salt", 32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
};
exports.encryptWithPassword = encryptWithPassword;
const sanitizeInput = (input) => {
    return input.trim().replace(/[<>]/g, "");
};
exports.sanitizeInput = sanitizeInput;
const validateSchema = (schema, data) => {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
        return {
            error: error.details.map((d) => d.message).join(", "),
            value: undefined,
        };
    }
    return { error: null, value };
};
exports.validateSchema = validateSchema;
function manageAsyncOps(promise) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield promise;
            return [null, data];
        }
        catch (error) {
            return [error, null];
        }
    });
}
const generateOTP = (length = 4) => {
    return Math.random()
        .toString()
        .substring(2, 2 + length)
        .padStart(length, "0");
};
exports.generateOTP = generateOTP;
const generateUUID = () => {
    return (0, uuid_1.v4)();
};
exports.generateUUID = generateUUID;
const splitOTPDigits = (otp) => {
    return otp.split("");
};
exports.splitOTPDigits = splitOTPDigits;
function deepMerge(target, source) {
    if (!source)
        return target;
    if (!target)
        return source;
    const output = Object.assign({}, target);
    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (sourceValue &&
            typeof sourceValue === "object" &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === "object" &&
            !Array.isArray(targetValue)) {
            output[key] = deepMerge(targetValue, sourceValue);
        }
        else if (sourceValue !== undefined) {
            output[key] = sourceValue;
        }
    }
    return output;
}
const storage = multer_1.default.memoryStorage();
const uploadFiles = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error("Invalid file type. Only JPEG, JPG, PNG, PDF, SVG are allowed."));
        }
    },
});
exports.uploadLicenseMiddleware = uploadFiles.single("license");
var jwt_1 = require("./jwt");
Object.defineProperty(exports, "generateToken", { enumerable: true, get: function () { return jwt_1.generateToken; } });
Object.defineProperty(exports, "generateOTPFlowToken", { enumerable: true, get: function () { return jwt_1.generateOTPFlowToken; } });
Object.defineProperty(exports, "verifyToken", { enumerable: true, get: function () { return jwt_1.verifyToken; } });
Object.defineProperty(exports, "verifyOTPFlowToken", { enumerable: true, get: function () { return jwt_1.verifyOTPFlowToken; } });
Object.defineProperty(exports, "generateRefreshToken", { enumerable: true, get: function () { return jwt_1.generateRefreshToken; } });
Object.defineProperty(exports, "verifyRefreshToken", { enumerable: true, get: function () { return jwt_1.verifyRefreshToken; } });
var aws_s3_1 = require("./aws.s3");
Object.defineProperty(exports, "AwsUtil_s3", { enumerable: true, get: function () { return __importDefault(aws_s3_1).default; } });
var SendEmail_1 = require("./SendEmail");
Object.defineProperty(exports, "SendEmail", { enumerable: true, get: function () { return __importDefault(SendEmail_1).default; } });
