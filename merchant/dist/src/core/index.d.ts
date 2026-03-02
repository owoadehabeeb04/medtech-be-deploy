import { bootstrapRequestContext } from "./context";
export type RequestContextType = Awaited<ReturnType<typeof bootstrapRequestContext>>;
declare global {
    namespace Express {
        interface Request {
            context: RequestContextType;
        }
        interface Response {
            response?: {
                statusCode?: number;
                message?: string;
                data?: unknown;
            };
        }
    }
}
export declare const startServer: () => Promise<void>;
//# sourceMappingURL=index.d.ts.map