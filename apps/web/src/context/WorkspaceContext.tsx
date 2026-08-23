import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient, WorkspaceContextData } from "../api/client";
import { wsClient, WebSocketStatus } from "../api/websocket";

interface WorkspaceContextValue {
  context: WorkspaceContextData;
  setContext: (ctx: Partial<WorkspaceContextData>) => void;
  wsStatus: WebSocketStatus;
  apiStatus: "online" | "offline" | "checking";
  refreshHealth: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContextState] = useState<WorkspaceContextData>(apiClient.getContext());
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>("disconnected");
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");

  const setContext = (updates: Partial<WorkspaceContextData>) => {
    apiClient.setContext(updates);
    setContextState(apiClient.getContext());
  };

  const refreshHealth = async () => {
    setApiStatus("checking");
    try {
      await apiClient.getHealth();
      setApiStatus("online");
    } catch {
      setApiStatus("offline");
    }
  };

  useEffect(() => {
    // Initial health check
    refreshHealth();

    // Connect WebSocket
    wsClient.connect();
    const unsubWs = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });

    const interval = setInterval(refreshHealth, 15000);

    return () => {
      unsubWs();
      clearInterval(interval);
    };
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        context,
        setContext,
        wsStatus,
        apiStatus,
        refreshHealth,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
};
