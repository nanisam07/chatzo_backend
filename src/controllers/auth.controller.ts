import { Request, Response, NextFunction } from "express";
import {
  signupService,
  sendOtpService,
  verifyOtpService,
  loginService,
  logoutService,
  refreshTokenService,
  forgotPasswordService,
  resetPasswordService,
  getMeService,
  resendOtpService,
  onboardingService,
} from "../services/auth.service";
import { successResponse } from "../utils/response";
import { OtpType } from "@prisma/client";
import {
  SignupInput,
  LoginInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ResendOtpInput,
  SendOtpInput,
  OnboardingInput,
} from "../validators/auth.validator";

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const ACCESS_TOKEN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/signup
 */
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as SignupInput;
    const result = await signupService(body);
    successResponse(res, result.message, {
      requiresVerification: result.requiresVerification,
      email: result.email,
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/send-otp
 */
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, type } = req.body as SendOtpInput;
    const result = await sendOtpService(email, type as OtpType);
    successResponse(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/verify-otp
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as VerifyOtpInput;
    const result = await verifyOtpService(body);

    if ("accessToken" in result && result.accessToken) {
      // Set tokens in HTTP-only cookies
      res.cookie("accessToken", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
      res.cookie("refreshToken", result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      successResponse(res, result.message, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } else {
      successResponse(res, result.message, {
        otpVerified: "otpVerified" in result ? result.otpVerified : undefined,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as LoginInput;
    const result = await loginService(body);

    res.cookie("accessToken", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie("refreshToken", result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    successResponse(res, result.message, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken =
      (req.cookies?.refreshToken as string | undefined) ||
      (req.body?.refreshToken as string | undefined);

    if (refreshToken) {
      await logoutService(refreshToken);
    }

    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    successResponse(res, "Logged out successfully.", {});
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      (req.cookies?.refreshToken as string | undefined) ||
      (req.body?.refreshToken as string | undefined);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required.",
        errors: [],
      });
      return;
    }

    const result = await refreshTokenService(token);

    res.cookie("accessToken", result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie("refreshToken", result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    successResponse(res, result.message, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/resend-otp
 */
export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, type } = req.body as ResendOtpInput;
    const result = await resendOtpService(email, type as OtpType);
    successResponse(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as ForgotPasswordInput;
    const result = await forgotPasswordService(email);
    successResponse(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as ResetPasswordInput;
    const result = await resetPasswordService(body);
    successResponse(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
      return;
    }
    const result = await getMeService(req.user.id);
    successResponse(res, "Profile fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/auth/onboarding
 */
export const onboarding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
      return;
    }
    const body = req.body as OnboardingInput;
    const result = await onboardingService(req.user.id, body);
    successResponse(res, result.message, result.profile);
  } catch (error) {
    next(error);
  }
};
