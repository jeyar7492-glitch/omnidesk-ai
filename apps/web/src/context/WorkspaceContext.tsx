import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "@omnidesk/shared-types";
import { apiClient, WorkspaceContextData } from "../api/client";
import { wsClient, WebSocketStatus } from "../api/websocket";

interface WorkspaceContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  context: WorkspaceContextData;
  setContext: (ctx: Partial<WorkspaceContextData>) => void;
  wsStatus: WebSocketStatus;
  apiStatus: "online" | "offline" | "checking";
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    workspaceName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
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

  const login = async (email: string, password: string) => {
    const res = await apiClient.login(email, password);
    setUser(res.user);
    setIsAuthenticated(true);
    setContextState(apiClient.getContext());
    wsClient.connect();
  };

  const register = async (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    workspaceName?: string;
  }) => {
    const res = await apiClient.register(input);
    setUser(res.user);
    setIsAuthenticated(true);
    setContextState(apiClient.getContext());
    wsClient.connect();
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      wsClient.disconnect();
    }
  };

  // Restore Session on Startup
  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingAuth(true);
      try {
        const token = apiClient.getAccessToken();
        if (token) {
          try {
            const currentUser = await apiClient.getCurrentUser();
            setUser(currentUser);
            setIsAuthenticated(true);
            setContextState(apiClient.getContext());
            wsClient.connect();
          } catch {
            // Attempt token refresh
            try {
              await apiClient.refreshToken();
              const currentUser = await apiClient.getCurrentUser();
              setUser(currentUser);
              setIsAuthenticated(true);
              setContextState(apiClient.getContext());
              wsClient.connect();
            } catch {
              apiClient.clearSession();
              setIsAuthenticated(false);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();
    refreshHealth();

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
        user,
        isAuthenticated,
        isLoadingAuth,
        context,
        setContext,
        wsStatus,
        apiStatus,
        login,
        register,
        logout,
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
