import { Response } from "express";

export const successResponse = (
  res: Response,
  message: string,
  data: unknown = {},
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res: Response,
  status: number,
  message: string,
  errors: unknown[] = []
) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};