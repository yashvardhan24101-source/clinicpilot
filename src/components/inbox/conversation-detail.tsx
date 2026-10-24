"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  Bot,
  UserCheck,
  AlertTriangle,
  Phone,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { ChatMessageBubble } from "@/components/inbox/chat-message-bubble";
import { QuickReplies } from "@/components/inbox/quick-replies";
import { Conversation, ChatMessage } from "@/types/api";
import { maskPhoneNumber } from "@/lib/utils";

interface ConversationDetailProps {
  conversation: Conversation;
  onBack?: () => void;
  onSendMessage: (text: string) => void;
  onHandBack: () => void;
  isSending?: boolean;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
  onBack,
  onSendMessage,
  onHandBack,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [conversation.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const isStaffHandling = conversation.state === "needs_staff";

  return (
    <div className="flex flex-col h-full bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-2/30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back to conversation list"
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 -ml-1 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-signal"
              title="Back to conversation list"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink truncate font-devanagari">
                {conversation.patient_name}
              </h3>
              <StatusPill status={conversation.state} size="sm" />
            </div>
            <p className="text-xs text-ink-soft flex items-center gap-1 font-display mt-0.5">
              <Phone className="h-3 w-3 text-ink-faint" />
              <span>{maskPhoneNumber(conversation.patient_phone)}</span>
            </p>
          </div>
        </div>

        {/* Hand back to bot action button */}
        <div className="shrink-0 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onHandBack}
            className="gap-1.5 text-xs h-8 text-signal hover:bg-signal-subtle border-signal/30 shadow-none"
            title="Resume automatic WhatsApp bot responses"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hand back to bot</span>
            <span className="sm:hidden">Hand Back</span>
          </Button>
        </div>
      </div>

      {/* Staff Takeover Notice Banner */}
      {isStaffHandling && (
        <div className="bg-alert-subtle border-b border-alert/20 px-4 py-2 text-xs font-medium text-alert-foreground flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-alert" />
            <span>
              <strong>Staff Takeover Active:</strong> WhatsApp bot is paused for this patient.
            </span>
          </div>
          <button
            onClick={onHandBack}
            className="text-signal underline hover:no-underline font-semibold ml-2 shrink-0"
          >
            Resume Bot
          </button>
        </div>
      )}

      {/* Scrollable Message History Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-surface-0/50"
        aria-live="polite"
        role="log"
      >
        {conversation.messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Templates */}
      <QuickReplies onSelect={(text) => setInputText(text)} />

      {/* Message Composer Box */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-line bg-surface-1 flex items-center gap-2 shrink-0"
      >
        <Input
          placeholder="Reply in English, Hindi, or Hinglish..."
          aria-label="Reply message"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 font-devanagari text-sm min-h-[44px]"
          autoFocus
        />
        <Button
          type="submit"
          aria-label="Send reply message"
          disabled={!inputText.trim() || isSending}
          className="gap-1.5 shrink-0 px-4 min-h-[44px]"
          size="default"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
};
