import { OtpType, Prisma, User, MerchantProfile, OTPVerification, Session } from "@prisma/client";
import prisma from "../config/database";

// ─── User ─────────────────────────────────────────────────────────────────────

export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (
  id: string
): Promise<(User & { merchantProfile: MerchantProfile | null }) | null> => {
  return prisma.user.findUnique({
    where: { id },
    include: { merchantProfile: true },
  });
};

export const createUser = async (
  data: Prisma.UserCreateInput
): Promise<User> => {
  return prisma.user.create({ data });
};

export const updateUser = async (
  id: string,
  data: Prisma.UserUpdateInput
): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};

// ─── Merchant Profile ─────────────────────────────────────────────────────────

export const createMerchantProfile = async (
  data: Prisma.MerchantProfileCreateInput
): Promise<MerchantProfile> => {
  return prisma.merchantProfile.create({ data });
};

export const findMerchantByUserId = async (
  userId: string
): Promise<MerchantProfile | null> => {
  return prisma.merchantProfile.findUnique({ where: { userId } });
};

// ─── OTP ──────────────────────────────────────────────────────────────────────

export const createOtp = async (
  userId: string,
  otp: string,
  type: OtpType,
  expiresAt: Date
): Promise<OTPVerification> => {
  // Delete any existing OTPs of same type for this user before creating new
  await prisma.oTPVerification.deleteMany({ where: { userId, type } });

  return prisma.oTPVerification.create({
    data: { userId, otp, type, expiresAt },
  });
};

export const findValidOtp = async (
  userId: string,
  otp: string,
  type: OtpType
): Promise<OTPVerification | null> => {
  return prisma.oTPVerification.findFirst({
    where: {
      userId,
      otp,
      type,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });
};

export const findLatestOtp = async (
  userId: string,
  type: OtpType
): Promise<OTPVerification | null> => {
  return prisma.oTPVerification.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  });
};

export const markOtpVerified = async (id: string): Promise<void> => {
  await prisma.oTPVerification.update({
    where: { id },
    data: { verified: true },
  });
};

export const deleteExpiredOtps = async (): Promise<void> => {
  await prisma.oTPVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};

export const deleteOtpsByUserId = async (
  userId: string,
  type: OtpType
): Promise<void> => {
  await prisma.oTPVerification.deleteMany({ where: { userId, type } });
};

// ─── Session ──────────────────────────────────────────────────────────────────

export const createSession = async (
  userId: string,
  refreshToken: string,
  expiresAt: Date
): Promise<Session> => {
  return prisma.session.create({
    data: { userId, refreshToken, expiresAt },
  });
};

export const findSessionByToken = async (
  refreshToken: string
): Promise<Session | null> => {
  return prisma.session.findFirst({
    where: { refreshToken, expiresAt: { gt: new Date() } },
  });
};

export const deleteSession = async (refreshToken: string): Promise<void> => {
  await prisma.session.deleteMany({ where: { refreshToken } });
};

export const deleteAllUserSessions = async (userId: string): Promise<void> => {
  await prisma.session.deleteMany({ where: { userId } });
};

export const deleteExpiredSessions = async (): Promise<void> => {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};
