import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "../../api/client";
import { GlobalSearchResponse, SearchResultItem } from "@omnidesk/shared-types";
import {
  Search,
  X,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Milestone,
  Bot,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: "dashboard" | "ai" | "projects" | "tasks" | "crm" | "system", entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flattened results for keyboard navigation
  const flattenedItems: SearchResultItem[] = React.useMemo(() => {
    if (!results) return [];
    const groups = results.resultsByGroup;
    return [
      ...(groups.projects || []),
      ...(groups.tasks || []),
      ...(groups.crm || []),
      ...(groups.milestones || []),
      ...(groups.ai || []),
    ];
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await apiClient.globalSearch(query.trim(), 10);
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onNavigate(item.navigationTarget.tab, item.navigationTarget.entityId);
      onClose();
    },
    [onNavigate, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (flattenedItems.length > 0 ? (prev + 1) % flattenedItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          flattenedItems.length > 0 ? (prev - 1 + flattenedItems.length) % flattenedItems.length : 0
        );
      } else if (e.key === "Enter" && flattenedItems.length > 0) {
        e.preventDefault();
        const selected = flattenedItems[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flattenedItems, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderKanban size={15} color="var(--brand-cyan)" />;
      case "task":
        return <CheckSquare size={15} color="var(--brand-indigo)" />;
      case "customer":
      case "contact":
      case "lead":
      case "deal":
        return <TrendingUp size={15} color="var(--accent-green)" />;
      case "milestone":
        return <Milestone size={15} color="var(--accent-amber)" />;
      case "ai_execution":
        return <Bot size={15} color="#c084fc" />;
      default:
        return <Search size={15} color="var(--text-muted)" />;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "640px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "75vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
          }}
        >
          <Search size={18} color="var(--brand-cyan)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, tasks, CRM deals, leads, milestones, AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />
          {loading && <Loader2 size={16} className="spin" color="var(--brand-cyan)" />}
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0.2rem" }}
            >
              <X size={16} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* Search Results Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          {!query.trim() ? (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                Type a keyword to search across your workspace
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Quick jump: Projects • Tasks • Deals • Contacts • AI History
              </div>
            </div>
          ) : flattenedItems.length === 0 && !loading ? (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
                No results found for &ldquo;{query}&rdquo;
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Try searching with a different term or checking entity name.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Group: Projects */}
              {results?.resultsByGroup.projects && results.resultsByGroup.projects.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.5rem", letterSpacing: "0.05em" }}>
                    Projects ({results.resultsByGroup.projects.length})
                  </div>
                  {results.resultsByGroup.projects.map((item) => {
                    const globalIdx = flattenedItems.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(6, 182, 212, 0.15)" : "transparent",
                          border: isSelected ? "1px solid var(--brand-cyan)" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {getEntityIcon(item.entityType)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {item.status && <span style={{ fontSize: "0.7rem", color: "var(--brand-cyan)", background: "var(--bg-elevated)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{item.status}</span>}
                          <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: Tasks */}
              {results?.resultsByGroup.tasks && results.resultsByGroup.tasks.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.5rem", letterSpacing: "0.05em" }}>
                    Tasks ({results.resultsByGroup.tasks.length})
                  </div>
                  {results.resultsByGroup.tasks.map((item) => {
                    const globalIdx = flattenedItems.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(99, 102, 241, 0.15)" : "transparent",
                          border: isSelected ? "1px solid var(--brand-indigo)" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {getEntityIcon(item.entityType)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {item.status && <span style={{ fontSize: "0.7rem", color: "var(--brand-indigo)", background: "var(--bg-elevated)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{item.status}</span>}
                          <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: CRM */}
              {results?.resultsByGroup.crm && results.resultsByGroup.crm.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.5rem", letterSpacing: "0.05em" }}>
                    CRM & Sales ({results.resultsByGroup.crm.length})
                  </div>
                  {results.resultsByGroup.crm.map((item) => {
                    const globalIdx = flattenedItems.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(16, 185, 129, 0.15)" : "transparent",
                          border: isSelected ? "1px solid var(--accent-green)" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {getEntityIcon(item.entityType)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-green)", background: "var(--bg-elevated)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{item.badge}</span>
                          <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: Milestones */}
              {results?.resultsByGroup.milestones && results.resultsByGroup.milestones.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.5rem", letterSpacing: "0.05em" }}>
                    Milestones ({results.resultsByGroup.milestones.length})
                  </div>
                  {results.resultsByGroup.milestones.map((item) => {
                    const globalIdx = flattenedItems.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(245, 158, 11, 0.15)" : "transparent",
                          border: isSelected ? "1px solid var(--accent-amber)" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {getEntityIcon(item.entityType)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-amber)", background: "var(--bg-elevated)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{item.status || "Milestone"}</span>
                          <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: AI */}
              {results?.resultsByGroup.ai && results.resultsByGroup.ai.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.5rem", letterSpacing: "0.05em" }}>
                    AI Sessions ({results.resultsByGroup.ai.length})
                  </div>
                  {results.resultsByGroup.ai.map((item) => {
                    const globalIdx = flattenedItems.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(168, 85, 247, 0.15)" : "transparent",
                          border: isSelected ? "1px solid #c084fc" : "1px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {getEntityIcon(item.entityType)}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</div>
                            {item.subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "#c084fc", background: "var(--bg-elevated)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{item.status || "AI"}</span>
                          <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Workspace Isolated</span>
        </div>
      </div>
    </div>
  );
};
