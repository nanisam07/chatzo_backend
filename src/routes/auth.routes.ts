import { Router } from "express";
import {
  signup,
  sendOtp,
  verifyOtp,
  login,
  logout,
  refreshToken,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  onboarding,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOtpSchema,
  onboardingSchema,
} from "../validators/auth.validator";

const router = Router();

// Public routes
router.post("/signup", validate(signupSchema), signup);
router.post("/send-otp", validate(sendOtpSchema), sendOtp);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get("/me", authenticate, getMe);
router.patch("/onboarding", authenticate, validate(onboardingSchema), onboarding);

export default router;
