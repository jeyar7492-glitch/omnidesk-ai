import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function testConnection(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to MongoDB via Prisma Client...");
    await prisma.$connect();
    console.log("Prisma connection established successfully!");

    // Run a query on MongoDB database
    const userCount = await prisma.user.count();
    console.log(`Database query succeeded! Current User count in database: ${userCount}`);

    await prisma.$disconnect();
    console.log("PRISMA_CONNECTION_PASS");
  } catch (error: any) {
    console.error("Prisma connection error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
