import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { v1Router } from "./routes";
import { NotFoundError } from "./lib/errors";

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Set properly in production or allow dev frontend
    })
  );

  // CORS Middleware
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        env.CORS_ORIGIN,
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-request-id", "x-workspace-id"],
    })
  );

  // Request Parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  app.use(requestLogger);

  // General API Rate Limiting (skipped in test environment)
  if (process.env.NODE_ENV !== "test") {
    const apiLimiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded, please try again later",
        },
      },
    });
    app.use(env.API_PREFIX, apiLimiter);
  }

  // Root Health / Info Route
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // API Version 1 Routes
  app.use(env.API_PREFIX, v1Router);

  // Catch 404
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl || req.url}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
