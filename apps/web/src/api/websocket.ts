export type WebSocketStatus = "connecting" | "connected" | "disconnected";

export interface LiveEvent<T = any> {
  eventType: string;
  workspaceId: string;
  executionId?: string;
  timestamp: string;
  data: T;
}

export type EventCallback<T = any> = (event: LiveEvent<T>) => void;

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private status: WebSocketStatus = "disconnected";
  private reconnectTimer: any = null;
  private shouldReconnect = true;

  public connect(): void {
    if (typeof window === "undefined") return;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus("connecting");

    let token = "";
    try {
      token = localStorage.getItem("omnidesk_access_token") || "";
    } catch {
      // Ignore
    }
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

    let baseWsUrl = "";
    const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    if (metaEnv?.VITE_WS_URL) {
      baseWsUrl = metaEnv.VITE_WS_URL.replace(/\/+$/, "");
    } else if (metaEnv?.VITE_API_BASE_URL || metaEnv?.VITE_API_URL) {
      const apiUrl = (metaEnv.VITE_API_BASE_URL || metaEnv.VITE_API_URL).replace(/\/+$/, "");
      baseWsUrl = apiUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    } else if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || "localhost:4000";
      baseWsUrl = `${protocol}//${host}`;
    } else {
      baseWsUrl = "ws://localhost:4000";
    }


    const wsEndpoint = baseWsUrl.endsWith("/ws") ? baseWsUrl : `${baseWsUrl}/ws`;
    const wsUrl = `${wsEndpoint}${tokenQuery}`;



    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus("connected");
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const eventType = parsed.type || parsed.eventType;
          if (eventType) {
            const liveEvent: LiveEvent = {
              eventType,
              workspaceId: parsed.workspaceId || "",
              executionId: parsed.executionId || parsed.data?.executionId,
              timestamp: parsed.timestamp || new Date().toISOString(),
              data: parsed.data !== undefined ? parsed.data : parsed,
            };

            // Notify specific listeners
            const specific = this.listeners.get(eventType);
            if (specific) {
              specific.forEach((cb) => cb(liveEvent));
            }

            // Notify wildcard listeners
            const all = this.listeners.get("*");
            if (all) {
              all.forEach((cb) => cb(liveEvent));
            }
          }
        } catch {
          // ignore non-JSON messages (ping/pong etc.)
        }
      };

      this.socket.onerror = () => {
        this.setStatus("disconnected");
      };

      this.socket.onclose = () => {
        this.setStatus("disconnected");
        if (this.shouldReconnect && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch {
      this.setStatus("disconnected");
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus("disconnected");
  }

  public subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Ensure connection is active
    if (this.status === "disconnected") {
      this.connect();
    }

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  public onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }
}

export const wsClient = new WebSocketClient();
