"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  AlertTriangle,
  Bot,
  Search,
  CheckCircle2,
  Phone,
  Clock,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Row } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationDetail } from "@/components/inbox/conversation-detail";
import { api } from "@/lib/api";
import { maskPhoneNumber } from "@/lib/utils";
import { Conversation, ChatMessage } from "@/types/api";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filterState, setFilterState] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Poll conversations every 5 seconds for live WhatsApp incoming messages
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", filterState],
    queryFn: () => api.getConversations(filterState),
    refetchInterval: 5000,
  });

  // Filter by search query
  const filteredConversations = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.patient_name.toLowerCase().includes(q) ||
      c.patient_phone.includes(q) ||
      c.last_message.toLowerCase().includes(q)
    );
  });

  // Auto-select first conversation on desktop if none selected
  const activeConversation =
    conversations.find((c) => c.id === selectedId) ||
    (conversations.length > 0 ? conversations[0] : null);

  // Send Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.replyConversation(id, message),
    onMutate: async ({ id, message }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const prevConversations = queryClient.getQueryData<Conversation[]>([
        "conversations",
        filterState,
      ]);

      if (prevConversations) {
        const optimisticMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: id,
          sender: "staff",
          content: message,
          timestamp: "Just now",
          delivery_status: "sent",
        };

        queryClient.setQueryData<Conversation[]>(
          ["conversations", filterState],
          prevConversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  last_message: message,
                  last_message_time: "Just now",
                  messages: [...c.messages, optimisticMsg],
                }
              : c
          )
        );
      }

      return { prevConversations };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Hand Back to Bot Mutation
  const handbackMutation = useMutation({
    mutationFn: (id: string) => api.handbackConversation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const prevConversations = queryClient.getQueryData<Conversation[]>([
        "conversations",
        filterState,
      ]);

      if (prevConversations) {
        queryClient.setQueryData<Conversation[]>(
          ["conversations", filterState],
          prevConversations.map((c) =>
            c.id === id ? { ...c, state: "bot_handling" as const } : c
          )
        );
      }

      return { prevConversations };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const needsStaffCount = conversations.filter((c) => c.state === "needs_staff").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 h-[calc(100dvh-120px)] lg:h-[calc(100vh-90px)] flex flex-col">
      {/* Two Pane Layout Container */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* LEFT PANE: Conversation List (hidden on mobile if conversation selected) */}
        <div
          className={`w-full lg:w-[380px] shrink-0 flex flex-col bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Header & Controls */}
          <div className="p-3 border-b border-line space-y-3 bg-surface-2/20 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink font-display flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-signal" />
                  <span>WhatsApp Inbox</span>
                </h2>
                <p className="text-[11px] text-ink-soft">
                  Live clinic chats &amp; staff takeovers
                </p>
              </div>

              {needsStaffCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-alert-subtle text-alert-foreground text-xs font-bold border border-alert/30">
                  <AlertTriangle className="h-3 w-3 text-alert" />
                  <span>{needsStaffCount} Action</span>
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-ink-faint" />
              <Input
                placeholder="Search patient name, phone..."
                aria-label="Search patient name, phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-10 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setFilterState("all")}
                aria-label={`All (${conversations.length}) conversations`}
                className={`px-3.5 py-1.5 min-h-[44px] inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  filterState === "all"
                    ? "bg-signal text-white border-signal shadow-sm"
                    : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
                }`}
              >
                All ({conversations.length})
              </button>

              <button
                onClick={() => setFilterState("needs_staff")}
                aria-label={`Needs Staff (${needsStaffCount}) - Show conversations needing staff takeover`}
                className={`px-3.5 py-1.5 min-h-[44px] inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-colors border gap-1 ${
                  filterState === "needs_staff"
                    ? "bg-alert text-white border-alert shadow-sm"
                    : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Needs Staff ({needsStaffCount})</span>
              </button>

              <button
                onClick={() => setFilterState("bot_handling")}
                aria-label="Bot Active - Show conversations handled by bot"
                className={`px-3.5 py-1.5 min-h-[44px] inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-colors border gap-1 ${
                  filterState === "bot_handling"
                    ? "bg-signal-subtle text-signal border-signal/40 shadow-sm"
                    : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Bot Active</span>
              </button>
            </div>
          </div>

          {/* Scrollable Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-line-subtle">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;

                return (
                  <Row
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    highlight={conv.state === "needs_staff"}
                    active={isSelected}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-signal-subtle/80" : "hover:bg-surface-2/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-sm font-bold text-ink truncate font-devanagari">
                          {conv.patient_name}
                        </span>
                        <span className="text-[10px] text-ink-faint font-display tabular-nums shrink-0">
                          {conv.last_message_time}
                        </span>
                      </div>

                      <p className="text-xs text-ink-soft truncate font-devanagari">
                        {conv.last_message}
                      </p>

                      <div className="flex items-center justify-between gap-1 mt-1.5">
                        <span className="text-[11px] text-ink-faint font-display">
                          {maskPhoneNumber(conv.patient_phone)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={conv.state} size="sm" />
                          {conv.unread_count > 0 && (
                            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-white font-display">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Row>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="h-6 w-6 text-ink-faint mx-auto" />
                <p className="text-xs text-ink-soft">
                  {search || filterState !== "all"
                    ? "No conversations found."
                    : "No conversations yet. Connect WhatsApp to start receiving messages."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Conversation Detail View */}
        <div
          className={`flex-1 h-full ${
            selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeConversation ? (
            <ConversationDetail
              conversation={activeConversation}
              onBack={() => setSelectedId(null)}
              onSendMessage={(msg) =>
                replyMutation.mutate({ id: activeConversation.id, message: msg })
              }
              onHandBack={() => handbackMutation.mutate(activeConversation.id)}
              isSending={replyMutation.isPending}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-1 rounded-2xl border border-line p-8 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-subtle text-signal">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-ink font-display">
                {conversations.length === 0 ? "No Conversations" : "Select a WhatsApp Conversation"}
              </h3>
              <p className="text-xs text-ink-soft max-w-xs">
                {conversations.length === 0
                  ? "No conversations yet. Connect WhatsApp to start receiving messages."
                  : "Pick a patient from the list on the left to review messages, send replies, or hand over to the bot."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
