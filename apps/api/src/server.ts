import http from "http";
import { WebSocketServer } from "ws";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { connectPrisma, prisma } from "./lib/prisma";
import { wsManager } from "./lib/websocket";

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket Foundation with workspace manager
  const wss = new WebSocketServer({ server, path: "/ws" });
  wsManager.init(wss);

  // Attempt database connection check (non-blocking if DB not yet up)
  await connectPrisma();

  server.listen(env.PORT, env.HOST, () => {
    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        env: env.NODE_ENV,
        healthEndpoint: `http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}${env.API_PREFIX}/health`,
        wsEndpoint: `ws://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}/ws`,
      },
      `OmniDesk AI API Gateway running on http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}`
    );
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, "Received termination signal, shutting down gracefully...");
    wss.close();
    server.close(async () => {
      logger.info("HTTP/WS server closed.");
      await prisma.$disconnect();
      logger.info("Prisma disconnected. Exiting process.");
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to bootstrap OmniDesk AI API Gateway");
  process.exit(1);
});
