import React, { useState, useEffect } from "react";
import {
  ConversationSummary,
  ConversationDetail,
  MessageSummary,
  PresenceStatus,
} from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import { wsClient } from "../../api/websocket";
import { useWorkspace } from "../../context/WorkspaceContext";
import { ConversationList } from "./ConversationList";
import { MessageTimeline } from "./MessageTimeline";
import { MessageComposer } from "./MessageComposer";
import { ThreadDrawer } from "./ThreadDrawer";
import { CreateConversationModal } from "./CreateConversationModal";
import { ConversationSettingsModal } from "./ConversationSettingsModal";
import {
  Users,
  Settings,
  Search,
  MessageSquare,
  X,
} from "lucide-react";

export const CommunicationView: React.FC = () => {
  const { context } = useWorkspace();
  const currentUserId = context.userId;

  // Conversations State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Messages State
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Modals & Panels
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState<MessageSummary | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageSummary | null>(null);

  // Search inside Conversation
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Ephemeral Realtime States
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; timeout: NodeJS.Timeout }>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, { status: PresenceStatus; lastSeen: string }>>({});

  // 1. Initial load of conversations
  useEffect(() => {
    loadConversations();
    // Announce current user presence
    apiClient.updatePresence("online").catch(() => {});
  }, []);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const res = await apiClient.listConversations({ limit: 50 });
      setConversations(res.items || []);
      if (!selectedConversationId && res.items && res.items.length > 0) {
        setSelectedConversationId(res.items[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // 2. Load selected conversation details and messages
  useEffect(() => {
    if (!selectedConversationId) return;

    loadConversationDetails(selectedConversationId);
    loadMessages(selectedConversationId);
    apiClient.markConversationRead(selectedConversationId).catch(() => {});

    // Clear thread drawer on conversation switch
    setActiveThreadMessage(null);
    setEditingMessage(null);
    setIsSearchOpen(false);
    setSearchResults([]);
  }, [selectedConversationId]);

  const loadConversationDetails = async (id: string) => {
    try {
      const conv = await apiClient.getConversation(id);
      setActiveConversation(conv);
    } catch {
      // Fallback
    }
  };

  const loadMessages = async (convId: string, cursor?: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await apiClient.listMessages(convId, {
        limit: 40,
        cursor,
        direction: "before",
      });

      if (cursor) {
        setMessages((prev) => [...(res.items || []), ...prev]);
      } else {
        setMessages(res.items || []);
      }
      setNextCursor(res.nextCursor);
      setHasMoreMessages(res.hasMore);
    } catch {
      // Fallback
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && selectedConversationId) {
      loadMessages(selectedConversationId, nextCursor);
    }
  };

  // 3. Realtime WebSocket subscription
  useEffect(() => {
    const unsub = wsClient.subscribe("*", (event) => {
      const { eventType, data } = event;

      // New message
      if (eventType === "message.created" && data) {
        const msg = data.message as MessageSummary;
        if (msg) {
          if (msg.conversationId === selectedConversationId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            apiClient.markConversationRead(selectedConversationId).catch(() => {});
          }

          // Update conversation list preview
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === msg.conversationId) {
                return {
                  ...c,
                  lastMessage: msg,
                  lastMessageAt: msg.createdAt,
                  unreadCount:
                    msg.conversationId === selectedConversationId
                      ? 0
                      : (c.unreadCount || 0) + 1,
                };
              }
              return c;
            })
          );
        }
      }

      // Message updated / edited
      if (eventType === "message.updated" && data) {
        const updated = data.message as MessageSummary;
        if (updated && updated.conversationId === selectedConversationId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      }

      // Message deleted
      if (eventType === "message.deleted" && data) {
        const { messageId, conversationId } = data;
        if (conversationId === selectedConversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    content: "",
                    reactions: [],
                    attachments: [],
                  }
                : m
            )
          );
        }
      }

      // Reaction added/removed
      if ((eventType === "reaction.added" || eventType === "reaction.removed") && data) {
        const { messageId, conversationId } = data;
        if (conversationId === selectedConversationId) {
          // Refetch single message to ensure synchronized reactions
          apiClient.getMessage(conversationId, messageId).then((fresh) => {
            setMessages((prev) => prev.map((m) => (m.id === fresh.id ? fresh : m)));
          }).catch(() => {});
        }
      }

      // Typing indicator
      if (eventType === "typing.updated" && data) {
        const { conversationId, userId: typerId, isTyping } = data;
        if (conversationId === selectedConversationId && typerId !== currentUserId) {
          setTypingUsers((prev) => {
            const next = { ...prev };
            if (isTyping) {
              if (next[typerId]?.timeout) clearTimeout(next[typerId].timeout);
              const timeout = setTimeout(() => {
                setTypingUsers((curr) => {
                  const cleaned = { ...curr };
                  delete cleaned[typerId];
                  return cleaned;
                });
              }, 4000);
              next[typerId] = { userId: typerId, timeout };
            } else {
              if (next[typerId]?.timeout) clearTimeout(next[typerId].timeout);
              delete next[typerId];
            }
            return next;
          });
        }
      }

      // Presence updated
      if (eventType === "presence.updated" && data) {
        const { userId: pUserId, status, lastSeen } = data;
        setPresenceMap((prev) => ({
          ...prev,
          [pUserId]: { status, lastSeen },
        }));
      }

      // Conversation created
      if (eventType === "conversation.created" && data) {
        loadConversations();
      }

      // Conversation updated
      if (eventType === "conversation.updated" && data) {
        const { conversationId } = data;
        if (conversationId === selectedConversationId) {
          loadConversationDetails(conversationId);
        }
        loadConversations();
      }
    });

    return () => {
      unsub();
    };
  }, [selectedConversationId, currentUserId]);

  // Message Actions
  const handleSendMessage = async (content: string, attachmentIds: string[]) => {
    if (!selectedConversationId) return;
    const sent = await apiClient.sendMessage(selectedConversationId, {
      content,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
    });
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!selectedConversationId || !editingMessage) return;
    const updated = await apiClient.editMessage(
      selectedConversationId,
      editingMessage.id,
      { content: newContent }
    );
    setMessages((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    setEditingMessage(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversationId) return;
    await apiClient.deleteMessage(selectedConversationId, messageId);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isDeleted: true,
              content: "",
              reactions: [],
              attachments: [],
            }
          : m
      )
    );
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversationId) return;
    await apiClient.addReaction(selectedConversationId, messageId, emoji);
    const fresh = await apiClient.getMessage(selectedConversationId, messageId);
    setMessages((prev) => prev.map((m) => (m.id === fresh.id ? fresh : m)));
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversationId) return;
    await apiClient.removeReaction(selectedConversationId, messageId, emoji);
    const fresh = await apiClient.getMessage(selectedConversationId, messageId);
    setMessages((prev) => prev.map((m) => (m.id === fresh.id ? fresh : m)));
  };

  // In-Conversation Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedConversationId) return;

    setIsSearching(true);
    try {
      const res = await apiClient.searchCommunication({
        q: searchQuery.trim(),
        conversationId: selectedConversationId,
      });
      setSearchResults(res.items || []);
    } catch {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  // Resolve Header Title and Info
  const isGroup = activeConversation?.type === "GROUP";
  const headerTitle = activeConversation
    ? activeConversation.title || "Direct Conversation"
    : "Select a conversation";

  return (
    <div
      className="communication-view"
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* 1. Left Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={(id) => setSelectedConversationId(id)}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        isLoading={isLoadingConversations}
        presenceMap={presenceMap}
        currentUserId={currentUserId}
      />

      {/* 2. Middle Panel: Chat Window */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "var(--bg-primary)",
          overflow: "hidden",
        }}
      >
        {selectedConversationId && activeConversation ? (
          <>
            {/* Conversation Header */}
            <div
              style={{
                height: "60px",
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: isGroup ? "10px" : "50%",
                    background: isGroup ? "rgba(99, 102, 241, 0.2)" : "rgba(6, 182, 212, 0.2)",
                    border: `1px solid ${isGroup ? "var(--brand-indigo)" : "var(--brand-cyan)"}`,
                    color: isGroup ? "var(--brand-indigo)" : "var(--brand-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  {isGroup ? <Users size={18} /> : headerTitle.substring(0, 2).toUpperCase()}
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {headerTitle}
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {isGroup
                      ? `${activeConversation.members.length} members`
                      : "Direct Communication"}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Search In Conversation */}
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    background: isSearchOpen ? "var(--bg-card)" : "transparent",
                    color: isSearchOpen ? "var(--brand-cyan)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                  title="Search in conversation"
                >
                  <Search size={16} />
                </button>

                {/* Group Settings Button */}
                {isGroup && (
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                    title="Group Settings"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* In-Conversation Search Bar */}
            {isSearchOpen && (
              <div
                style={{
                  padding: "10px 24px",
                  background: "var(--bg-secondary)",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages in this conversation..."
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: "var(--brand-cyan)",
                      color: "#0a0c10",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "6px",
                    borderRadius: "4px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* In-Conversation Search Results Drawer / Overlay */}
            {searchResults.length > 0 && (
              <div
                style={{
                  padding: "12px 24px",
                  background: "var(--bg-elevated)",
                  borderBottom: "1px solid var(--border-medium)",
                  maxHeight: "180px",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Found {searchResults.length} matching messages:
                </div>
                {searchResults.map((sm) => (
                  <div
                    key={sm.id}
                    style={{
                      padding: "6px 10px",
                      background: "var(--bg-card)",
                      borderRadius: "6px",
                      marginBottom: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--brand-cyan)", marginRight: "8px" }}>
                      {sm.sender?.firstName || "Member"}:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>{sm.content}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <MessageTimeline
              conversationId={selectedConversationId}
              messages={messages}
              currentUserId={currentUserId}
              isLoading={isLoadingMessages}
              hasMore={hasMoreMessages}
              onLoadMore={handleLoadMore}
              onOpenThread={(msg) => setActiveThreadMessage(msg)}
              onEditMessage={(msg) => setEditingMessage(msg)}
              onDeleteMessage={handleDeleteMessage}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />

            {/* Typing Indicator Strip */}
            {Object.keys(typingUsers).length > 0 && (
              <div
                style={{
                  padding: "4px 24px",
                  fontSize: "12px",
                  color: "var(--brand-cyan)",
                  fontStyle: "italic",
                  background: "var(--bg-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span className="pulse-animation">●</span>
                <span>Someone is typing...</span>
              </div>
            )}

            {/* Composer */}
            <MessageComposer
              conversationId={selectedConversationId}
              members={activeConversation.members}
              onSendMessage={handleSendMessage}
              editingMessage={editingMessage}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingMessage(null)}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              gap: "16px",
            }}
          >
            <MessageSquare size={48} color="var(--border-medium)" />
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "var(--text-primary)" }}>
                OmniDesk Enterprise Communication
              </h3>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Select a conversation or start a new direct or group chat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Thread Drawer */}
      {activeThreadMessage && selectedConversationId && activeConversation && (
        <ThreadDrawer
          parentMessage={activeThreadMessage}
          conversationId={selectedConversationId}
          members={activeConversation.members}
          currentUserId={currentUserId}
          onClose={() => setActiveThreadMessage(null)}
          onReplyAdded={(_reply) => {
            // Update parent message replyCount locally
            setMessages((prev) =>
              prev.map((m) =>
                m.id === activeThreadMessage.id
                  ? { ...m, replyCount: (m.replyCount || 0) + 1 }
                  : m
              )
            );
          }}
        />
      )}

      {/* New Conversation Modal */}
      <CreateConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onConversationCreated={(created) => {
          loadConversations();
          setSelectedConversationId(created.id);
        }}
      />

      {/* Group Settings Modal */}
      {isSettingsModalOpen && activeConversation && (
        <ConversationSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          conversation={activeConversation}
          currentUserId={currentUserId}
          onConversationUpdated={(updated) => {
            setActiveConversation(updated);
            loadConversations();
          }}
          onLeftConversation={() => {
            setSelectedConversationId(null);
            setActiveConversation(null);
            loadConversations();
          }}
        />
      )}
    </div>
  );
};
