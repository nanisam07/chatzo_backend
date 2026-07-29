import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../types/errors";
import prisma from "../config/database";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract token from Authorization header or HTTP-only cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    if (!token) {
      throw new UnauthorizedError("Authentication required. Please log in.");
    }

    // 2. Verify token
    const payload = verifyAccessToken(token);

    // 3. Fetch user from DB (ensures account still exists & not disabled)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { merchantProfile: true },
    });

    if (!user) {
      throw new UnauthorizedError("Account not found. Please log in again.");
    }

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireEmailVerified = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user?.emailVerified) {
    next(
      new UnauthorizedError(
        "Please verify your email address before accessing this resource."
      )
    );
    return;
  }
  next();
};
