import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import validate from "../middleware/validate.middleware.js";
import RegisterDto from "../dto/register.dto.js";
import { authenticate } from "../middleware/auth.middleware.js";
import LoginDto from "../dto/login.dto.js";

const router = Router();

router.post("/register", validate(RegisterDto), controller.register);
router.post("/login", validate(LoginDto), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.getMe);
router.get("/verify-email", controller.verifyEmail);
router.post("/resend-verification", controller.resendVerification);

export default router;