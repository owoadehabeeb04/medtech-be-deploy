import { Request, Response, NextFunction } from "express";
/**
 * Middleware to check if merchant has completed onboarding
 * Apply this to routes that require full merchant setup
 */
export declare const requireOnboarding: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=onboarding.middleware.d.ts.map