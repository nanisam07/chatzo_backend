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
    console.log("========== AUTH ==========");
    console.log("Authorization:", req.headers.authorization);
    console.log("Cookie:", req.cookies);

    let token: string | undefined;

    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    console.log("Token:", token);

    const payload = verifyAccessToken(token!);

    console.log("Payload:", payload);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      include: {
        merchantProfile: true,
      },
    });

    console.log("User:", user);

    req.user = user!;
    next();
  } catch (err) {
    console.error("AUTH ERROR");
    console.error(err);
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
