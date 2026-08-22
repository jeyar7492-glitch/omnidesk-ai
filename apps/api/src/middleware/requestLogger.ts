import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: duration,
        requestId,
      },
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode} in ${duration}ms`
    );
  });

  next();
}
