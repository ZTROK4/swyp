import { Router } from "express";
import { createOrUpdateEmailOTP, createOrUpdatePhoneOTP, verifyEmailOTP, verifyPhoneOTP } from "../controllers/verificationController";

const router = Router();

router.post("/send-phone-otp", createOrUpdatePhoneOTP);
router.post("/send-email-otp",createOrUpdateEmailOTP);
router.post("/verify-email-otp", verifyEmailOTP);
router.post("/verify-phone-otp", verifyPhoneOTP);

export default router;
