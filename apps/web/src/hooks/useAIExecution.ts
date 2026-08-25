import { useState, useCallback, useEffect } from "react";
import { apiClient } from "../api/client";
import { wsClient, LiveEvent } from "../api/websocket";
import {
  AIExecutionStatus,
  AIExecutionStep,
} from "@omnidesk/shared-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  executionId?: string;
  status?: AIExecutionStatus;
  steps?: AIExecutionStep[];
  approvalRequest?: {
    id: string;
    actionName: string;
    riskLevel: string;
    params?: any;
    status: string;
    reason?: string;
  };
  error?: string;
  safeProgress?: string;
}

export function useAIExecution() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [safeStatus, setSafeStatus] = useState<string | null>(null);

  // Safe mapping for live agent execution progress
  const getSafeProgressMessage = (eventType: string, data: any): string => {
    switch (eventType) {
      case "ai:request_started":
        return "Understanding request...";
      case "ai:planning":
        return `Formulating execution plan (step ${data?.stepNumber || 1})...`;
      case "ai:tool_proposed":
        return `Selecting tool: ${data?.toolId?.replace(/_/g, " ")}...`;
      case "ai:tool_started":
        return `Executing ${data?.toolId?.replace(/_/g, " ")} on workspace database...`;
      case "ai:tool_completed":
        return `Operation ${data?.toolId?.replace(/_/g, " ")} completed successfully.`;
      case "ai:approval_requested":
        return "High-risk action identified. Pausing for human authorization...";
      case "ai:approval_decided":
        return `Approval ${data?.status?.toLowerCase()} by operator.`;
      case "ai:execution_completed":
        return "Execution completed.";
      default:
        return "Processing...";
    }
  };

  // Listen to live WebSocket execution events
  useEffect(() => {
    const handleLiveEvent = (event: LiveEvent) => {
      const eventType = event.eventType;
      const executionId = event.executionId;

      if (!eventType.startsWith("ai:")) return;

      const progressText = getSafeProgressMessage(eventType, event.data);
      setSafeStatus(progressText);

      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.executionId === executionId || (activeExecutionId && msg.executionId === activeExecutionId)) {
            const updated: ChatMessage = { ...msg, safeProgress: progressText };

            if (eventType === "ai:approval_requested") {
              updated.status = "WAITING_APPROVAL";
              updated.approvalRequest = {
                id: event.data.approvalId || event.data.id,
                actionName: event.data.actionName || event.data.toolId || "Restricted Action",
                riskLevel: event.data.riskLevel || "HIGH",
                params: event.data.params,
                status: "PENDING",
                reason: event.data.decisionReason || "This operation modifies enterprise resources and requires human approval.",
              };
            } else if (eventType === "ai:approval_decided") {
              if (updated.approvalRequest) {
                updated.approvalRequest.status = event.data.status;
              }
            } else if (eventType === "ai:execution_completed") {
              updated.status = event.data.status || "COMPLETED";
              setIsExecuting(false);
              setSafeStatus(null);
            }

            return updated;
          }
          return msg;
        });
      });
    };

    const unsub = wsClient.subscribe("*", handleLiveEvent);
    return () => unsub();
  }, [activeExecutionId]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isExecuting) return;

      const userMsgId = `user_${Date.now()}`;
      const assistantMsgId = `assistant_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: prompt.trim(),
        timestamp,
      };

      const pendingAssistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp,
        status: "PLANNING",
        safeProgress: "Understanding request and planning workflow...",
      };

      setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
      setIsExecuting(true);
      setSafeStatus("Planning workflow...");

      try {
        const response = await apiClient.executeAI({ prompt: prompt.trim() });
        const execId = (response as any).executionId || response.id;
        setActiveExecutionId(execId);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMsgId) {
              const approvalReq = response.approvalRequest
                ? {
                    id: response.approvalRequest.id,
                    actionName: (response.approvalRequest as any).actionName || response.approvalRequest.toolId,
                    riskLevel: response.approvalRequest.riskLevel,
                    params: (response.approvalRequest as any).params || response.approvalRequest.proposedArguments,
                    status: response.approvalRequest.status,
                    reason: "Requires human sign-off before mutating database.",
                  }
                : undefined;

              return {
                ...msg,
                executionId: execId,
                status: response.status,
                content: response.finalResponse || (response.status === "WAITING_APPROVAL" ? "A high-risk action requires your approval before proceeding." : "Action processed."),
                steps: response.steps,
                approvalRequest: approvalReq,
                safeProgress: response.status === "COMPLETED" ? "Done" : undefined,
              };
            }
            return msg;
          })
        );

        if (response.status !== "WAITING_APPROVAL") {
          setIsExecuting(false);
          setSafeStatus(null);
        }
      } catch (err: any) {
        setIsExecuting(false);
        setSafeStatus(null);
        const errorMsg =
          err.code === "AI_PROVIDER_NOT_CONFIGURED" || err.status === 503
            ? "AI Provider is not configured on this environment. Please configure an API key (e.g. GEMINI_API_KEY) in the backend .env."
            : err.message || "An unexpected error occurred during execution.";

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMsgId) {
              return {
                ...msg,
                status: "FAILED",
                error: errorMsg,
                content: `Execution Failed: ${errorMsg}`,
                safeProgress: undefined,
              };
            }
            return msg;
          })
        );
      }
    },
    [isExecuting]
  );

  const approve = useCallback(
    async (approvalId: string, reason?: string) => {
      try {
        setSafeStatus("Authorizing execution...");
        await apiClient.approveAction(approvalId, reason);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.approvalRequest?.id === approvalId) {
              return {
                ...msg,
                status: "EXECUTING_TOOL",
                approvalRequest: {
                  ...msg.approvalRequest,
                  status: "APPROVED",
                },
                safeProgress: "Approved. Executing action on database...",
              };
            }
            return msg;
          })
        );
      } catch (err: any) {
        setSafeStatus(null);
        alert(`Approval failed: ${err.message}`);
      }
    },
    []
  );

  const reject = useCallback(
    async (approvalId: string, reason?: string) => {
      try {
        await apiClient.rejectAction(approvalId, reason);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.approvalRequest?.id === approvalId) {
              return {
                ...msg,
                status: "FAILED",
                approvalRequest: {
                  ...msg.approvalRequest,
                  status: "REJECTED",
                },
                content: "Action was rejected by human operator. No changes were made to the database.",
                safeProgress: undefined,
              };
            }
            return msg;
          })
        );
        setIsExecuting(false);
        setSafeStatus(null);
      } catch (err: any) {
        alert(`Rejection failed: ${err.message}`);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveExecutionId(null);
    setIsExecuting(false);
    setSafeStatus(null);
  }, []);

  return {
    messages,
    isExecuting,
    safeStatus,
    sendPrompt,
    approve,
    reject,
    clearMessages,
  };
}
