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
exports.bootstrapRequestContext = void 0;
const db_1 = __importDefault(require("./db"));
const utils_1 = __importStar(require("@medtech/utils"));
const error_codes_1 = require("../constants/error-codes");
const config_1 = require("../config");
const eventEmitter_1 = require("../observers/eventEmitter");
const { encryption } = config_1.applicationConfig;
const bootstrapRequestContext = () => __awaiter(void 0, void 0, void 0, function* () {
    const sequelize = yield (0, db_1.default)();
    const token = null;
    const user = null;
    const files = null;
    const encrypter = (data) => encryption.enabled
        ? (0, utils_1.encryptWithPassword)(JSON.stringify(data), encryption.password)
        : data;
    return {
        sequelize,
        user,
        manageApplicationErrors: utils_1.default.manageApplicationErrors,
        manageAsyncOps: utils_1.manageAsyncOps,
        validateSchema: utils_1.validateSchema,
        files,
        token,
        sanitizeInput: utils_1.sanitizeInput,
        redis: {
        // Add Redis methods here if needed
        },
        AppEventEmitter: eventEmitter_1.AppEventEmitter,
        errorCode: error_codes_1.ERROR_CODES,
        encrypt: encrypter,
        sanitizeBody: utils_1.sanitizeBody,
        sanitizeBody2: utils_1.sanitizeBody2,
    };
});
exports.bootstrapRequestContext = bootstrapRequestContext;
