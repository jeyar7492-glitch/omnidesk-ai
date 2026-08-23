import React, { useState, useRef, useEffect } from "react";
import { useAIExecution } from "../../hooks/useAIExecution";
import { MessageList } from "./MessageList";
import { HistoryDrawer } from "./HistoryDrawer";
import { Send, Sparkles, Trash2, History, ArrowRight } from "lucide-react";

export const AIAssistant: React.FC = () => {
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isExecuting,
    safeStatus,
    sendPrompt,
    approve,
    reject,
    clearMessages,
  } = useAIExecution();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, safeStatus]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isExecuting) return;

    const promptText = input.trim();
    setInput("");
    await sendPrompt(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const promptSuggestions = [
    "Show my overdue tasks",
    "Show the progress of my projects",
    "Which projects are currently at risk?",
    "Show my open CRM deals",
    "Analyze team workload",
    "Create a task called API performance optimization with priority HIGH",
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", position: "relative" }}>
      {/* Action Bar */}
      <div
        style={{
          padding: "0.75rem 1.5rem",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={16} color="var(--brand-cyan)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>OmniDesk AI Supervisor</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setHistoryOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              background: "var(--bg-card)",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <History size={14} /> Audit Log
          </button>

          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8rem",
                background: "var(--bg-card)",
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-indigo))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
                boxShadow: "0 0 20px rgba(6, 182, 212, 0.35)",
              }}
            >
              <Sparkles size={24} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              How can OmniDesk AI assist you today?
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Ask questions about projects, assign tasks, evaluate risk, forecast CRM pipelines, or command multi-step workflows.
            </p>

            {/* Quick Action Suggestion Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", width: "100%" }}>
              {promptSuggestions.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendPrompt(prompt)}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    textAlign: "left",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-cyan)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <span>{prompt}</span>
                  <ArrowRight size={13} color="var(--brand-cyan)" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "860px", width: "100%", margin: "0 auto" }}>
            <MessageList
              messages={messages}
              safeStatus={safeStatus}
              isExecuting={isExecuting}
              onApprove={approve}
              onReject={reject}
            />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <div
        style={{
          padding: "1rem 1.5rem",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-end",
            gap: "0.75rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-medium)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command OmniDesk AI or ask questions... (Press Enter to send)"
            disabled={isExecuting}
            style={{
              flex: 1,
              resize: "none",
              fontSize: "0.9rem",
              lineHeight: 1.4,
              maxHeight: "120px",
              padding: "0.2rem 0",
            }}
          />

          <button
            type="submit"
            disabled={!input.trim() || isExecuting}
            style={{
              background: input.trim() && !isExecuting ? "linear-gradient(135deg, var(--brand-cyan), var(--brand-blue))" : "var(--bg-elevated)",
              color: input.trim() && !isExecuting ? "#ffffff" : "var(--text-muted)",
              padding: "0.5rem 0.85rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              boxShadow: input.trim() && !isExecuting ? "0 2px 10px rgba(6, 182, 212, 0.35)" : "none",
            }}
          >
            <span>Run</span>
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* History Audit Drawer */}
      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
};
