import { WebSocketServer, WebSocket } from "ws";
import { RealtimeEventEnvelope } from "@omnidesk/shared-types";
import { logger } from "./logger";

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  workspaceId?: string;
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ExtendedWebSocket> = new Set();

  public init(wss: WebSocketServer): void {
    this.wss = wss;

    this.wss.on("connection", (ws: ExtendedWebSocket, req) => {
      this.clients.add(ws);
      ws.isAlive = true;

      // Extract workspace and user query params if provided in URL
      try {
        const url = new URL(req.url || "/", "http://localhost");
        ws.workspaceId = url.searchParams.get("workspaceId") || undefined;
        ws.userId = url.searchParams.get("userId") || undefined;
      } catch {
        // Fallback default
      }

      logger.info(
        {
          remoteAddress: req.socket.remoteAddress,
          workspaceId: ws.workspaceId,
          userId: ws.userId,
        },
        "WebSocket client connected"
      );

      // Handshake event
      ws.send(
        JSON.stringify({
          id: `evt_${Date.now()}`,
          event: "system.connected",
          workspaceId: ws.workspaceId,
          payload: {
            message: "OmniDesk AI Realtime Gateway Connected",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        } satisfies RealtimeEventEnvelope)
      );

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === "ping") {
            ws.send(
              JSON.stringify({
                id: `evt_${Date.now()}`,
                event: "pong",
                payload: { timestamp: new Date().toISOString() },
                timestamp: new Date().toISOString(),
              } satisfies RealtimeEventEnvelope)
            );
          } else if (parsed.event === "join_workspace" && parsed.workspaceId) {
            ws.workspaceId = parsed.workspaceId;
            ws.userId = parsed.userId || ws.userId;
            logger.info({ workspaceId: ws.workspaceId }, "WebSocket client bound to workspace");
          }
        } catch {
          // Ignore invalid frames
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        logger.info("WebSocket client disconnected");
      });
    });

    // Heartbeat check every 30s
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  public broadcastToWorkspace<T>(
    workspaceId: string,
    event: string,
    payload: T,
    sender?: { userId: string; role?: string }
  ): void {
    const envelope: RealtimeEventEnvelope<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      event,
      workspaceId,
      payload,
      timestamp: new Date().toISOString(),
      sender,
    };

    const dataStr = JSON.stringify(envelope);

    this.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (!client.workspaceId || client.workspaceId === workspaceId)
      ) {
        client.send(dataStr);
      }
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
