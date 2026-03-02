import CustomError, { manageAsyncOps, sanitizeBody, sanitizeBody2 } from "@medtech/utils";
export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    permissions?: string[];
    [key: string]: any;
}
export declare const bootstrapRequestContext: () => Promise<{
    sequelize: import("sequelize-typescript").Sequelize;
    user: AuthenticatedUser;
    manageApplicationErrors: typeof CustomError.manageApplicationErrors;
    manageAsyncOps: typeof manageAsyncOps;
    validateSchema: (schema: import("joi").Schema, data: any) => {
        error: string | null;
        value: any;
    };
    files: any;
    token: string;
    sanitizeInput: (input: string) => string;
    redis: {};
    AppEventEmitter: import("events")<[never]>;
    errorCode: {
        BAD_REQUEST: number;
        UNAUTHORIZED: number;
        FORBIDDEN: number;
        NOT_FOUND: number;
        INTERNAL_SERVER_ERROR: number;
    };
    encrypt: (data: any) => any;
    sanitizeBody: typeof sanitizeBody;
    sanitizeBody2: typeof sanitizeBody2;
}>;
//# sourceMappingURL=context.d.ts.map