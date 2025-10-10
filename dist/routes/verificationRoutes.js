import { Router } from "express";
import { createOrUpdateOTP, verifyOTP } from "../controllers/verificationController";
const router = Router();
router.post("/send", createOrUpdateOTP);
router.post("/verify", verifyOTP);
export default router;
//# sourceMappingURL=verificationRoutes.js.map