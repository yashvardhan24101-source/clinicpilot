"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Bot,
  MapPin,
  Clock,
  FileText,
  RotateCcw,
} from "lucide-react";

interface WhatsAppMessage {
  id: string;
  sender: "bot" | "patient";
  text: string;
  time: string;
}

export const WhatsAppPhoneSimulator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: "w-1",
      sender: "bot",
      text: "Namaste! Welcome to SmileCraft Dental Clinic. Your automated healthcare assistant is active. Bookings, appointments, and live tokens will appear here directly.",
      time: "10:15 AM",
    },
    {
      id: "w-2",
      sender: "bot",
      text: "🔔 *Appointment Update*: Dr. Ananya Sharma is currently seeing *Token #3*. If your appointment is today, your live queue status is updated in real time.",
      time: "10:30 AM",
    },
  ]);

  // Listen for storage events or custom booking events to simulate instant WhatsApp dispatch
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const bookings = JSON.parse(
          localStorage.getItem("clinicpilot_patient_bookings") || "[]"
        );
        if (bookings.length > 0) {
          const latest = bookings[0];
          const newMsg: WhatsAppMessage = {
            id: `w-${Date.now()}`,
            sender: "bot",
            text: `✅ *Appointment Confirmed!*\n\n👨‍⚕️ Doctor: ${latest.doctor_name}\n📅 Date: ${latest.date} at ${latest.start_time}\n🎟️ Token Number: #${latest.token_number || 1}\n📋 Pass Code: #${latest.booking_code}\n\nReply *TOKEN* to check live queue or *LOCATION* for Google Maps.`,
            time: "Just now",
          };
          setMessages((prev) => {
            if (!prev.some((m) => m.text.includes(latest.booking_code))) {
              setUnreadCount((c) => c + 1);
              return [...prev, newMsg];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also run on mount
    handleStorageChange();
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const patientMsg: WhatsAppMessage = {
      id: `p-${Date.now()}`,
      sender: "patient",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, patientMsg]);
    setInputText("");
    setIsTyping(true);

    // Automated smart replies
    setTimeout(() => {
      let reply = "Thank you for reaching out! A clinic team member or Dr. Ananya will assist you shortly.";
      const lower = text.toLowerCase();

      if (lower.includes("token") || lower.includes("queue") || lower.includes("status")) {
        reply = "🎟️ *Live Queue Update*:\n\nDoctor is currently with *Token #3*.\nNext up: *Token #4*.\nEstimated wait per patient: ~15 minutes.\nPlease be present in the waiting lounge 10 mins prior.";
      } else if (lower.includes("location") || lower.includes("address") || lower.includes("map")) {
        reply = "📍 *SmileCraft Clinic Address*:\n2nd Floor, Horizon Crest, Waterfield Road, Bandra West, Mumbai 400050.\nLandmark: Opposite Starbucks Reserve.\nGoogle Maps: https://maps.google.com";
      } else if (lower.includes("timing") || lower.includes("hour") || lower.includes("open")) {
        reply = "🕒 *Clinic Timings*:\nMonday - Saturday: 09:00 AM - 08:00 PM\nSunday: 10:00 AM - 02:00 PM (Emergency appointments on call).";
      } else if (lower.includes("reschedule") || lower.includes("cancel")) {
        reply = "🔄 *Reschedule Request Received*:\nYou can reschedule your slot directly in your ClinicPilot portal, or reply with your preferred date and time.";
      }

      const botReply: WhatsAppMessage = {
        id: `b-${Date.now()}`,
        sender: "bot",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botReply]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#25D366] text-white font-bold text-xs shadow-lg hover:bg-[#20BD5A] active:scale-95 transition-all group"
          title="Open Live WhatsApp Notification Simulator"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5 fill-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline font-display">Live WhatsApp</span>
        </button>
      </div>

      {/* Simulated Phone Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-full max-w-[360px] h-[520px] bg-slate-900 rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          {/* Top Speaker / Camera notch */}
          <div className="bg-slate-900 py-1 flex justify-center items-center">
            <div className="h-2.5 w-20 bg-slate-800 rounded-full" />
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  SC
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#25D366] border-2 border-[#075E54]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-xs truncate leading-none">
                    SmileCraft Clinic Bot
                  </h3>
                  <span className="text-[10px] text-emerald-300">✓</span>
                </div>
                <span className="text-[10px] text-emerald-100 block mt-0.5">
                  {isTyping ? "typing..." : "online • Official Account"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Video className="h-4 w-4 opacity-80" />
              <Phone className="h-4 w-4 opacity-80" />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-black/20 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 bg-[#ECE5DD] p-3 overflow-y-auto space-y-2.5 font-sans text-xs">
            {/* Encryption notice */}
            <div className="mx-auto max-w-[260px] bg-[#FFF2C6] text-[#665320] p-1.5 rounded-lg text-[10px] text-center shadow-2xs">
              🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
            </div>

            {messages.map((msg) => {
              const isBot = msg.sender === "bot";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 shadow-2xs whitespace-pre-wrap leading-relaxed ${
                      isBot
                        ? "bg-white text-slate-800 rounded-tl-xs"
                        : "bg-[#DCF8C6] text-slate-900 rounded-tr-xs"
                    }`}
                  >
                    <div className="text-[11.5px]">{msg.text}</div>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500">
                      <span>{msg.time}</span>
                      {!isBot && (
                        <CheckCheck className="h-3.5 w-3.5 text-[#34B7F1]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 px-3 py-1.5 rounded-2xl text-[11px] rounded-tl-xs animate-pulse shadow-2xs">
                  Clinic Assistant is typing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Suggestions */}
          <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-300">
            <button
              onClick={() => handleSendMessage("Check my live token status")}
              className="px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 hover:bg-slate-100 whitespace-nowrap shrink-0 shadow-2xs"
            >
              🎟️ My Token
            </button>
            <button
              onClick={() => handleSendMessage("Clinic location and directions")}
              className="px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 hover:bg-slate-100 whitespace-nowrap shrink-0 shadow-2xs"
            >
              📍 Clinic Location
            </button>
            <button
              onClick={() => handleSendMessage("What are your clinic timings?")}
              className="px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 hover:bg-slate-100 whitespace-nowrap shrink-0 shadow-2xs"
            >
              🕒 Clinic Timings
            </button>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-[#F0F0F0] p-2 flex items-center gap-2 border-t border-slate-200"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a WhatsApp reply..."
              className="flex-1 bg-white text-slate-800 px-3 py-2 rounded-full text-xs border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-full bg-[#128C7E] text-white disabled:opacity-50 hover:bg-[#075E54] transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
