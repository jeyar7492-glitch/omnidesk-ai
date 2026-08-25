import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { ApiResponse } from "@omnidesk/shared-types";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

  if (err instanceof ZodError || (err as any).name === "ZodError") {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: (err as ZodError).errors,
        requestId,
      },
    };

    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    logger.warn(
      {
        err: {
          message: err.message,
          code: err.code,
          statusCode: err.statusCode,
          details: err.details,
        },
        requestId,
        path: req.path,
        method: req.method,
      },
      `Operational error: ${err.message}`
    );

    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }


  // Unhandled internal server error
  logger.error(
    {
      err: {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      requestId,
      path: req.path,
      method: req.method,
    },
    "Unhandled internal server error"
  );

  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected internal server error occurred"
          : err.message,
      requestId,
    },
  };

  res.status(500).json(response);
}
