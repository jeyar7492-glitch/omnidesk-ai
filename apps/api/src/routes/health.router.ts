import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  let dbStatus: "connected" | "disconnected" | "unavailable" = "unavailable";
  let dbLatencyMs: number | undefined = undefined;

  try {
    const start = performance.now();
    await prisma.$runCommandRaw({ ping: 1 });
    dbLatencyMs = Math.round(performance.now() - start);
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  res.status(200).json({
    status: "ok",
    service: "omnidesk-api",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  });
});
