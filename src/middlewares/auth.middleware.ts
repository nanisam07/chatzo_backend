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
    let token: string | undefined;

    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      next(new UnauthorizedError("Authentication token is required"));
      return;
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      include: {
        merchantProfile: true,
      },
    });

    if (!user) {
      next(new UnauthorizedError("User account not found"));
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
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
