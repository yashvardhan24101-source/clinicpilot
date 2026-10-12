import React from "react";
import { Check, CheckCheck, Bot, User, UserCheck } from "lucide-react";
import { ChatMessage } from "@/types/api";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isStaff = message.sender === "staff";
  const isBot = message.sender === "bot";
  const isPatient = message.sender === "patient";

  return (
    <div
      className={`flex flex-col ${
        isStaff ? "items-end" : "items-start"
      } my-2 max-w-[85%] sm:max-w-[75%] ${isStaff ? "ml-auto" : "mr-auto"}`}
    >
      {/* Sender Label & Icon */}
      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-ink-soft">
        {isBot && (
          <>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal-subtle text-signal">
              <Bot className="h-2.5 w-2.5" />
            </span>
            <span>ClinicPilot Assistant (Bot)</span>
          </>
        )}
        {isStaff && (
          <>
            <span>You (Clinic Staff)</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-white">
              <UserCheck className="h-2.5 w-2.5" />
            </span>
          </>
        )}
        {isPatient && (
          <>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
              <User className="h-2.5 w-2.5" />
            </span>
            <span>Patient</span>
          </>
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`relative px-4 py-2.5 shadow-sm text-sm leading-relaxed transition-all ${
          isStaff
            ? "bg-signal text-white rounded-2xl rounded-tr-sm"
            : isBot
            ? "bg-signal-subtle/70 text-ink border border-signal/20 rounded-2xl rounded-tl-sm"
            : "bg-surface-1 text-ink border border-line rounded-2xl rounded-tl-sm"
        }`}
      >
        <p className="font-devanagari whitespace-pre-wrap break-words text-[14px]">
          {message.content}
        </p>

        {/* Timestamp and Delivery Checkmarks */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-display tabular-nums ${
            isStaff ? "text-white/80" : "text-ink-faint"
          }`}
        >
          <span>{message.timestamp}</span>

          {isStaff && (
            <span title={`Status: ${message.delivery_status}`}>
              {message.delivery_status === "read" ? (
                <CheckCheck className="h-3 w-3 text-white" />
              ) : message.delivery_status === "delivered" ? (
                <CheckCheck className="h-3 w-3 text-white/70" />
              ) : (
                <Check className="h-3 w-3 text-white/70" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
