import { Router } from "express";
import { createOrUpdateOTP, createOrUpdateOTPsign, verifyOTP } from "../controllers/verificationController";

const router = Router();

router.post("/send", createOrUpdateOTP);
router.post("/signup",createOrUpdateOTPsign);
router.post("/verify", verifyOTP);

export default router;
