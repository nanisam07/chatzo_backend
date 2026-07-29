import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const field = issue.path.join(".");
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        res.status(422).json({
          success: false,
          message: "Validation failed",
          errors,
        });
        return;
      }
      next(error);
    }
  };
