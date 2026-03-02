import { NextFunction, Request, Response } from "express";
export declare const getOnboardingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const acceptTerms: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadValidId: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const uploadProfilePicture: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const verifyBankAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=MerchantOnboarding.controller.d.ts.map