import { AIEventType, AIEventPayload } from "@omnidesk/shared-types";
import { wsManager } from "../../lib/websocket";
import { logger } from "../../lib/logger";

export class AIEventEmitter {
  public static emit<T>(
    workspaceId: string,
    executionId: string,
    type: AIEventType,
    data: T,
    sender?: { userId: string; role?: string }
  ): AIEventPayload<T> {
    const payload: AIEventPayload<T> = {
      eventId: `aievt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      executionId,
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    logger.info(
      {
        workspaceId,
        executionId,
        eventType: type,
      },
      `[AI Event] ${type}`
    );

    // Broadcast to authorized workspace clients
    wsManager.broadcastToWorkspace(workspaceId, type, payload, sender);

    return payload;
  }
}
