import { Router } from "express";
import { sendPhoneOtp,verifyPhoneOtp  } from "../controllers/loginController.js";

const router = Router();

router.post("/sendotp", sendPhoneOtp);
router.post("/verifyOtp",verifyPhoneOtp);

export default router;
