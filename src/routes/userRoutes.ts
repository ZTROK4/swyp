import { Router } from "express";
import { addOrUpdateEmail, createUser, getUser } from "../controllers/userController.js";

const router = Router();

router.post("/create", createUser);
router.get("/:id", getUser);
router.post("/updateemail", addOrUpdateEmail);

export default router;
