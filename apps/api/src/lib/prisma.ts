import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Atlas connection strings sometimes arrive without a database path. Prisma's
// MongoDB connector requires one; default to the app database without logging
// or exposing any credentials.
function ensureDatabaseName(): void {
  const value = process.env.DATABASE_URL;
  if (!value || (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://"))) return;

  try {
    const url = new URL(value);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/omnidesk_ai";
      process.env.DATABASE_URL = url.toString();
      logger.info("MongoDB URI has no database path; using the omnidesk_ai database");
    }
  } catch {
    // Leave malformed connection strings untouched; Prisma will report the
    // connection error without this helper exposing the URI.
  }
}

ensureDatabaseName();

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Connected to MongoDB via Prisma ORM");
  } catch (err: any) {
    logger.warn({ error: err.message }, "Prisma connection pending or database initializing");
  }
}
