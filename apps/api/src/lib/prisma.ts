import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

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
