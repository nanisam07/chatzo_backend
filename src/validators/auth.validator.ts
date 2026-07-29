import { z } from "zod";

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be under 100 characters")
    .trim(),
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(150, "Business name is too long")
    .trim(),
  businessCategory: z
    .string()
    .max(100, "Business category is too long")
    .trim()
    .optional()
    .default("General"),
  country: z.string().min(2, "Country is required").max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid phone number")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const sendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Please enter a valid email address").toLowerCase(),
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
