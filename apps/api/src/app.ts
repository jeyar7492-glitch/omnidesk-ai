import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
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
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    ...env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
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

  // Serve static React web app if dist directory exists
  const webDistCandidates = [
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(__dirname, "../../../apps/web/dist"),
    path.resolve(process.cwd(), "dist"),
  ];
  const webDistPath = webDistCandidates.find((p) => fs.existsSync(p) && fs.existsSync(path.join(p, "index.html")));
  if (webDistPath) {
    app.use(express.static(webDistPath));
    app.get("*", (req: Request, res: Response, next) => {
      if (req.path.startsWith(env.API_PREFIX) || req.path === "/health" || req.path.startsWith("/ws")) {
        return next();
      }
      const indexPath = path.join(webDistPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
  }


  // Catch 404 for unmatched API routes
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl || req.url}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

