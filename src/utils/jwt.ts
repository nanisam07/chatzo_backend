import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../types/errors";

export interface TokenPayload extends JwtPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    console.log("JWT SECRET =", env.JWT_SECRET);

    const decoded = jwt.verify(token, env.JWT_SECRET);

    console.log("Decoded =", decoded);

    return decoded as TokenPayload;
  } catch (err) {
    console.log("JWT ERROR =", err);

    throw new UnauthorizedError("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
};