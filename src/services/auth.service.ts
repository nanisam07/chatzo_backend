import { OtpType } from "@prisma/client";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  createMerchantProfile,
  findMerchantByUserId,
  updateMerchantProfileByUserId,
  createOtp,
  findValidOtp,
  findLatestOtp,
  markOtpVerified,
  deleteOtpsByUserId,
  createSession,
  findSessionByToken,
  deleteSession,
  deleteAllUserSessions,
} from "../repositories/auth.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generateOTP } from "../utils/otp";
import { sendMail } from "../config/mail";
import { verifyEmailTemplate } from "../emails/verify-email";
import { forgotPasswordTemplate } from "../emails/forgot-password";
import { welcomeTemplate } from "../emails/welcome";
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  TooManyRequestsError,
} from "../types/errors";
import type {
  SignupInput,
  LoginInput,
  VerifyOtpInput,
  ResetPasswordInput,
  OnboardingInput,
} from "../validators/auth.validator";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_EXPIRES_IN_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const REFRESH_EXPIRES_IN_DAYS = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function otpExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRES_IN_MINUTES);
  return d;
}

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_IN_DAYS);
  return d;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * Signup: creates a user + sends verification OTP directly in this step.
 * Returns email and requiresVerification flag so the client can immediately navigate to OTP verification.
 */
export const signupService = async (input: SignupInput) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    if (!existing.emailVerified) {
      // Resend OTP for unverified accounts
      const otp = generateOTP();
      await createOtp(existing.id, otp, OtpType.EMAIL_VERIFICATION, otpExpiresAt());
      await sendMail({
        to: existing.email,
        subject: "Verify your CHATZO account",
        html: verifyEmailTemplate({ fullName: existing.fullName, otp }),
      });
      return {
        message:
          "Account exists but is not verified. A new OTP has been sent to your email.",
        requiresVerification: true,
        email: existing.email,
      };
    }
    throw new ConflictError("An account with this email already exists.");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await createUser({
    fullName: input.fullName,
    email: input.email,
    password: hashedPassword,
  });

  await createMerchantProfile({
    user: { connect: { id: user.id } },
    businessName: input.businessName,
    businessCategory: input.businessCategory || "General",
    country: input.country,
    phone: input.phone,
  });

  const otp = generateOTP();
  await createOtp(user.id, otp, OtpType.EMAIL_VERIFICATION, otpExpiresAt());

  await sendMail({
    to: user.email,
    subject: "Verify your CHATZO account",
    html: verifyEmailTemplate({ fullName: user.fullName, otp }),
  });

  return {
    message:
      "Account created successfully. Please check your email for the verification OTP.",
    requiresVerification: true,
    email: user.email,
  };
};

/**
 * Send OTP: sends OTP for either email verification or password reset.
 */
export const sendOtpService = async (email: string, type: OtpType) => {
  const user = await findUserByEmail(email);
  if (!user) {
    return { message: "If this email exists, an OTP has been sent." };
  }

  if (type === OtpType.EMAIL_VERIFICATION && user.emailVerified) {
    throw new AppError("Email is already verified.", 400);
  }

  const latest = await findLatestOtp(user.id, type);
  if (latest) {
    const secondsSinceLast =
      (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      throw new TooManyRequestsError(
        `Please wait ${remaining} seconds before requesting a new OTP.`
      );
    }
  }

  const otp = generateOTP();
  await createOtp(user.id, otp, type, otpExpiresAt());

  if (type === OtpType.EMAIL_VERIFICATION) {
    await sendMail({
      to: user.email,
      subject: "Verify your CHATZO account",
      html: verifyEmailTemplate({ fullName: user.fullName, otp }),
    });
  } else {
    await sendMail({
      to: user.email,
      subject: "Reset your CHATZO password",
      html: forgotPasswordTemplate({ fullName: user.fullName, otp }),
    });
  }

  return { message: "OTP sent successfully. Please check your email." };
};

/**
 * Verify OTP: verifies email or validates password-reset intent.
 */
export const verifyOtpService = async (input: VerifyOtpInput) => {
  const user = await findUserByEmail(input.email);
  if (!user) throw new NotFoundError("Account not found.");

  const otpRecord = await findValidOtp(user.id, input.otp, input.type as OtpType);
  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP. Please request a new one.", 400);
  }

  await markOtpVerified(otpRecord.id);

  if (input.type === "EMAIL_VERIFICATION") {
    await updateUser(user.id, { emailVerified: true });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await createSession(user.id, refreshToken, refreshTokenExpiresAt());

    const merchant = await findMerchantByUserId(user.id);
    await sendMail({
      to: user.email,
      subject: "🎉 Welcome to CHATZO!",
      html: welcomeTemplate({
        fullName: user.fullName,
        businessName: merchant?.businessName ?? user.fullName,
      }),
    });

    return {
      message: "Email verified successfully. Welcome to CHATZO!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailVerified: true,
        role: user.role,
      },
    };
  }

  return {
    message: "OTP verified. You may now reset your password.",
    otpVerified: true,
  };
};

/**
 * Login: validates credentials, returns tokens.
 */
export const loginService = async (input: LoginInput) => {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isValid = await comparePassword(input.password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (!user.emailVerified) {
    const otp = generateOTP();
    await createOtp(user.id, otp, OtpType.EMAIL_VERIFICATION, otpExpiresAt());
    await sendMail({
      to: user.email,
      subject: "Verify your CHATZO account",
      html: verifyEmailTemplate({ fullName: user.fullName, otp }),
    });
    throw new AppError(
      "Please verify your email before logging in. A new OTP has been sent.",
      403
    );
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await createSession(user.id, refreshToken, refreshTokenExpiresAt());

  const merchant = await findMerchantByUserId(user.id);

  return {
    message: "Logged in successfully.",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      merchantProfile: merchant
        ? {
            businessName: merchant.businessName,
            businessCategory: merchant.businessCategory,
            logo: merchant.logo,
          }
        : null,
    },
  };
};

/**
 * Logout: deletes the session for the given refresh token.
 */
export const logoutService = async (refreshToken: string) => {
  await deleteSession(refreshToken);
  return { message: "Logged out successfully." };
};

/**
 * Refresh Tokens: validates refresh token, rotates both tokens.
 */
export const refreshTokenService = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);

  const session = await findSessionByToken(refreshToken);
  if (!session) {
    throw new UnauthorizedError("Session not found. Please log in again.");
  }

  await deleteSession(refreshToken);

  const newAccessToken = generateAccessToken(payload.userId);
  const newRefreshToken = generateRefreshToken(payload.userId);
  await createSession(payload.userId, newRefreshToken, refreshTokenExpiresAt());

  return {
    message: "Tokens refreshed successfully.",
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Forgot Password: sends a PASSWORD_RESET OTP.
 */
export const forgotPasswordService = async (email: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    return { message: "If this email exists, a reset OTP has been sent." };
  }

  const latest = await findLatestOtp(user.id, OtpType.PASSWORD_RESET);
  if (latest) {
    const secondsSinceLast =
      (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      throw new TooManyRequestsError(
        `Please wait ${remaining} seconds before requesting another reset OTP.`
      );
    }
  }

  const otp = generateOTP();
  await createOtp(user.id, otp, OtpType.PASSWORD_RESET, otpExpiresAt());

  await sendMail({
    to: user.email,
    subject: "Reset your CHATZO password",
    html: forgotPasswordTemplate({ fullName: user.fullName, otp }),
  });

  return { message: "If this email exists, a reset OTP has been sent." };
};

/**
 * Reset Password: validates OTP + sets new password.
 */
export const resetPasswordService = async (input: ResetPasswordInput) => {
  const user = await findUserByEmail(input.email);
  if (!user) throw new NotFoundError("Account not found.");

  const otpRecord = await findValidOtp(
    user.id,
    input.otp,
    OtpType.PASSWORD_RESET
  );
  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP. Please request a new one.", 400);
  }

  const hashedPassword = await hashPassword(input.password);
  await updateUser(user.id, { password: hashedPassword });

  await markOtpVerified(otpRecord.id);
  await deleteAllUserSessions(user.id);

  return {
    message:
      "Password reset successfully. Please log in with your new password.",
  };
};

/**
 * Get Current User: returns the authenticated user's profile.
 */
export const getMeService = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("Account not found.");

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
      merchantProfile: user.merchantProfile
        ? {
            id: user.merchantProfile.id,
            businessName: user.merchantProfile.businessName,
            businessCategory: user.merchantProfile.businessCategory,
            phone: user.merchantProfile.phone,
            country: user.merchantProfile.country,
            logo: user.merchantProfile.logo,
            banner: user.merchantProfile.banner,
            address: user.merchantProfile.address,
            currency: user.merchantProfile.currency,
            timezone: user.merchantProfile.timezone,
            businessHours: user.merchantProfile.businessHours,
            gstNumber: user.merchantProfile.gstNumber,
            licenseNumber: user.merchantProfile.licenseNumber,
          }
        : null,
    },
  };
};

/**
 * Resend OTP: wrapper around sendOtpService.
 */
export const resendOtpService = sendOtpService;

export const onboardingService = async (userId: string, input: OnboardingInput) => {
  await updateUser(userId, { fullName: input.ownerName });

  const profile = await updateMerchantProfileByUserId(userId, {
    businessName: input.businessName,
    businessCategory: input.businessCategory,
    phone: input.phone,
    country: input.country,
    address: input.address,
    currency: input.currency,
    timezone: input.timezone,
    businessHours: input.businessHours ? (input.businessHours as any) : undefined,
    logo: input.logo,
    banner: input.banner,
    gstNumber: input.gstNumber,
    licenseNumber: input.licenseNumber,
  });

  return {
    message: "Onboarding completed successfully. Welcome to your dashboard!",
    profile,
  };
};