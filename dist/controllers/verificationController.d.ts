import express from "express";
import type { Request, Response } from "express";
export declare const createOrUpdateOTP: (req: Request, res: Response) => Promise<void>;
export declare const verifyOTP: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=verificationController.d.ts.map