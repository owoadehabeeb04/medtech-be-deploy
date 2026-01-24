import connection from "./db";
import CustomError, { manageAsyncOps, validateSchema, sanitizeBody, sanitizeBody2, sanitizeInput, encryptWithPassword } from "@medtech/utils";
import { ERROR_CODES as errorCode } from "../constants/error-codes";


import { applicationConfig } from "../config";
import { AppEventEmitter } from "../observers/eventEmitter";

const { encryption } = applicationConfig;

export interface AuthenticatedUser {
  id:  string;
  email: string;
  name: string;
  permissions?: string[];
  [key: string]: any;
}

export const bootstrapRequestContext = async () => {
  const sequelize = await connection();
  const token: string | null = null;
  const user: AuthenticatedUser | null = null;
  const files: any = null;
  const encrypter = (data: any) => 
    encryption.enabled 
      ? encryptWithPassword(JSON.stringify(data), encryption.password) 
      : data;

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
      // Add Redis methods here if needed
    },
    AppEventEmitter,
    errorCode: errorCode,
    encrypt: encrypter,
    sanitizeBody,
    sanitizeBody2,
  };
};
