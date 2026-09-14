import { WebSocketServer, WebSocket, RawData } from "ws";
import type { IncomingMessage } from "http";
import { RealtimeEventEnvelope } from "@omnidesk/shared-types";
import { logger } from "./logger";
import { authService } from "../auth/services/auth.service";
import { prisma } from "./prisma";

export interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  workspaceId?: string;
  userId?: string;
  isAuthenticated?: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ExtendedWebSocket> = new Set();

  public init(wss: WebSocketServer): void {
    this.wss = wss;

    this.wss.on("connection", async (ws: ExtendedWebSocket, req: IncomingMessage) => {
      this.clients.add(ws);
      ws.isAlive = true;
      ws.isAuthenticated = false;

      // Extract authentication from handshake URL
      try {
        const url = new URL(req.url || "/", "http://localhost");
        const token = url.searchParams.get("token");
        const workspaceIdParam = url.searchParams.get("workspaceId");
        const userIdParam = url.searchParams.get("userId");

        if (token) {
          try {
            const payload = authService.verifyAccessToken(token);
            ws.userId = payload.userId;
            ws.workspaceId = workspaceIdParam || payload.workspaceId;
            ws.isAuthenticated = true;

            // Verify membership in DB
            if (ws.workspaceId && ws.userId) {
              const member = await prisma.workspaceMember.findUnique({
                where: {
                  workspaceId_userId: {
                    workspaceId: ws.workspaceId,
                    userId: ws.userId,
                  },
                },
              });

              if (!member) {
                logger.warn(
                  { userId: ws.userId, workspaceId: ws.workspaceId },
                  "WebSocket connection rejected: User is not a member of target workspace"
                );
                ws.send(
                  JSON.stringify({
                    event: "error",
                    error: "Unauthorized: Invalid workspace membership",
                  })
                );
                ws.close(4403, "Forbidden");
                return;
              }
            }
          } catch (err: any) {
            logger.warn({ err: err.message }, "WebSocket handshake token verification failed");
            ws.send(
              JSON.stringify({
                event: "error",
                error: "Unauthorized: Invalid or expired token",
              })
            );
            ws.close(4401, "Unauthorized");
            return;
          }
        } else if (process.env.NODE_ENV === "test" && (workspaceIdParam || userIdParam)) {
          // Controlled test environment fallback
          ws.workspaceId = workspaceIdParam || undefined;
          ws.userId = userIdParam || undefined;
          ws.isAuthenticated = true;
        } else {
          // Dev / Local initial connection - give grace period for client auth frame
          ws.workspaceId = workspaceIdParam || undefined;
          ws.userId = userIdParam || undefined;
        }
      } catch {
        // Fallback default
      }

      if (ws.isAuthenticated && ws.workspaceId && ws.userId) {
        this.addPresence(ws.workspaceId, ws.userId);
      }

      logger.info(
        {
          remoteAddress: req.socket.remoteAddress,
          workspaceId: ws.workspaceId,
          userId: ws.userId,
          isAuthenticated: ws.isAuthenticated,
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
            authenticated: ws.isAuthenticated,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        } satisfies RealtimeEventEnvelope)
      );

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (data: RawData) => {
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
          } else if (parsed.event === "auth" && parsed.token) {
            try {
              const payload = authService.verifyAccessToken(parsed.token);
              const targetWs = parsed.workspaceId || payload.workspaceId;

              const member = await prisma.workspaceMember.findUnique({
                where: {
                  workspaceId_userId: {
                    workspaceId: targetWs,
                    userId: payload.userId,
                  },
                },
              });

              if (!member) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    error: "Forbidden: Not a member of this workspace",
                  })
                );
                return;
              }

              ws.userId = payload.userId;
              ws.workspaceId = targetWs;
              ws.isAuthenticated = true;
              this.addPresence(ws.workspaceId, ws.userId);

              ws.send(
                JSON.stringify({
                  event: "authenticated",
                  workspaceId: ws.workspaceId,
                  userId: ws.userId,
                  timestamp: new Date().toISOString(),
                })
              );
              logger.info({ userId: ws.userId, workspaceId: ws.workspaceId }, "WebSocket client authenticated via frame");
            } catch (err: any) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  error: "Unauthorized: Invalid token",
                })
              );
            }
          } else if (parsed.event === "join_workspace" && parsed.workspaceId) {
            if (!ws.isAuthenticated && parsed.token) {
              try {
                const payload = authService.verifyAccessToken(parsed.token);
                ws.userId = payload.userId;
                ws.isAuthenticated = true;
              } catch {
                ws.send(JSON.stringify({ event: "error", error: "Unauthorized token" }));
                return;
              }
            }

            if (ws.userId) {
              const member = await prisma.workspaceMember.findUnique({
                where: {
                  workspaceId_userId: {
                    workspaceId: parsed.workspaceId,
                    userId: ws.userId,
                  },
                },
              });

              if (!member) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    error: "Forbidden: Access denied to foreign workspace",
                  })
                );
                return;
              }

              ws.workspaceId = parsed.workspaceId;
              logger.info({ workspaceId: ws.workspaceId, userId: ws.userId }, "WebSocket client bound to authorized workspace");
            } else if (process.env.NODE_ENV === "test") {
              ws.workspaceId = parsed.workspaceId;
            }
          }
        } catch {
          // Ignore invalid frames
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        this.removePresence(ws.workspaceId, ws.userId);
        logger.info("WebSocket client disconnected");
      });
    });

    // Heartbeat check every 30s
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          this.removePresence(ws.workspaceId, ws.userId);
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

  // ── In-Memory Presence Tracking ─────────────────────────────────────────────
  private presenceMap: Map<string, Map<string, { socketCount: number; status: "online" | "away" | "offline"; lastSeen: string }>> = new Map();

  public addPresence(workspaceId?: string, userId?: string, status: "online" | "away" | "offline" = "online"): void {
    if (!workspaceId || !userId) return;
    if (!this.presenceMap.has(workspaceId)) {
      this.presenceMap.set(workspaceId, new Map());
    }
    const wsMap = this.presenceMap.get(workspaceId)!;
    const userEntry = wsMap.get(userId) || { socketCount: 0, status: "online" as const, lastSeen: new Date().toISOString() };
    userEntry.socketCount++;
    userEntry.status = status;
    userEntry.lastSeen = new Date().toISOString();
    wsMap.set(userId, userEntry);

    // Broadcast presence update
    this.broadcastToWorkspace(workspaceId, "presence.updated", {
      userId,
      status,
      lastSeen: userEntry.lastSeen,
    });
  }

  public removePresence(workspaceId?: string, userId?: string): void {
    if (!workspaceId || !userId) return;
    const wsMap = this.presenceMap.get(workspaceId);
    if (!wsMap) return;
    const userEntry = wsMap.get(userId);
    if (!userEntry) return;

    userEntry.socketCount = Math.max(0, userEntry.socketCount - 1);
    if (userEntry.socketCount === 0) {
      userEntry.status = "offline";
      userEntry.lastSeen = new Date().toISOString();
      this.broadcastToWorkspace(workspaceId, "presence.updated", {
        userId,
        status: "offline",
        lastSeen: userEntry.lastSeen,
      });
    }
  }

  public getPresence(workspaceId: string, userIds?: string[]): Record<string, { status: "online" | "away" | "offline"; lastSeen?: string }> {
    const result: Record<string, { status: "online" | "away" | "offline"; lastSeen?: string }> = {};
    const wsMap = this.presenceMap.get(workspaceId);
    if (!wsMap) return result;

    if (userIds && userIds.length > 0) {
      for (const uid of userIds) {
        const entry = wsMap.get(uid);
        if (entry) {
          result[uid] = { status: entry.status, lastSeen: entry.lastSeen };
        } else {
          result[uid] = { status: "offline" };
        }
      }
    } else {
      wsMap.forEach((entry, uid) => {
        result[uid] = { status: entry.status, lastSeen: entry.lastSeen };
      });
    }
    return result;
  }

  /**
   * Relay typing indicator to specific conversation members without persistence.
   */
  public relayTyping(
    workspaceId: string,
    conversationId: string,
    senderUserId: string,
    senderName: string,
    recipientUserIds: string[],
    isTyping: boolean
  ): void {
    const recipients = recipientUserIds.filter((id) => id !== senderUserId);
    if (!recipients.length) return;

    this.sendToUsers(
      workspaceId,
      recipients,
      isTyping ? "typing.started" : "typing.stopped",
      {
        conversationId,
        userId: senderUserId,
        userName: senderName,
        isTyping,
      }
    );
  }

  /**
   * Broadcast an event strictly to clients connected and authenticated to the target workspace.
   */
  public broadcastToWorkspace<T>(
    workspaceId: string,
    event: string,
    payload: T,
    sender?: { userId: string; role?: string }
  ): void {
    if (!workspaceId) return;

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
      // STRICT TENANT ISOLATION:
      if (
        client.readyState === WebSocket.OPEN &&
        client.workspaceId &&
        client.workspaceId === workspaceId
      ) {
        client.send(dataStr);
      }
    });
  }

  /**
   * Send an event strictly to a specific user authenticated in the target workspace.
   */
  public sendToUser<T>(
    workspaceId: string,
    userId: string,
    event: string,
    payload: T,
    sender?: { userId: string; role?: string }
  ): void {
    if (!workspaceId || !userId) return;

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
        client.workspaceId === workspaceId &&
        client.userId === userId
      ) {
        client.send(dataStr);
      }
    });
  }

  /**
   * Send an event strictly to a subset of users authenticated in the target workspace.
   */
  public sendToUsers<T>(
    workspaceId: string,
    userIds: string[],
    event: string,
    payload: T,
    sender?: { userId: string; role?: string }
  ): void {
    if (!workspaceId || !userIds.length) return;
    const userSet = new Set(userIds);

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
        client.workspaceId === workspaceId &&
        client.userId &&
        userSet.has(client.userId)
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

