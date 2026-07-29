import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../types/errors";
import { env } from "../config/env";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Operational errors we explicitly created
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: [],
    });
    return;
  }

  // Prisma unique constraint violations
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    res.status(409).json({
      success: false,
      message: "A record with these details already exists.",
      errors: [],
    });
    return;
  }

  // Unknown / programming errors
  console.error("[Error]", err);

  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "An unexpected error occurred. Please try again."
        : err.message,
    errors:
      env.NODE_ENV === "development"
        ? [{ stack: err.stack }]
        : [],
  });
};
