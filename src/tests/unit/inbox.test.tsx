import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChatMessageBubble } from "@/components/inbox/chat-message-bubble";
import { QuickReplies } from "@/components/inbox/quick-replies";
import { ConversationDetail } from "@/components/inbox/conversation-detail";
import { ChatMessage, Conversation } from "@/types/api";

const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    conversation_id: "conv-1",
    sender: "patient",
    content: "नमस्ते, क्या डॉक्टर साहब उपलब्ध हैं?",
    timestamp: "10:20 AM",
    delivery_status: "read",
  },
  {
    id: "msg-2",
    conversation_id: "conv-1",
    sender: "bot",
    content: "Doctor Ananya Sharma will be available at 11:00 AM.",
    timestamp: "10:21 AM",
    delivery_status: "read",
  },
  {
    id: "msg-3",
    conversation_id: "conv-1",
    sender: "staff",
    content: "Please bring your previous prescription.",
    timestamp: "10:22 AM",
    delivery_status: "delivered",
  },
];

const mockConversation: Conversation = {
  id: "conv-1",
  patient_id: "pat-2",
  patient_name: "सुनीता देवी (Sunita Devi)",
  patient_phone: "+91 98234 56789",
  state: "needs_staff",
  last_message: "नमस्ते, क्या डॉक्टर साहब उपलब्ध हैं?",
  last_message_time: "10:20 AM",
  unread_count: 1,
  messages: mockMessages,
};

describe("Inbox Components", () => {
  it("renders ChatMessageBubble with sender labels and Hindi text properly", () => {
    const { rerender } = render(<ChatMessageBubble message={mockMessages[0]} />);
    expect(screen.getByText("Patient")).toBeInTheDocument();
    expect(screen.getByText("नमस्ते, क्या डॉक्टर साहब उपलब्ध हैं?")).toBeInTheDocument();

    rerender(<ChatMessageBubble message={mockMessages[1]} />);
    expect(screen.getByText(/ClinicPilot Assistant/)).toBeInTheDocument();

    rerender(<ChatMessageBubble message={mockMessages[2]} />);
    expect(screen.getByText(/You \(Clinic Staff\)/)).toBeInTheDocument();
  });

  it("renders QuickReplies and triggers selection callback", () => {
    const onSelect = vi.fn();
    render(<QuickReplies onSelect={onSelect} />);

    const chip = screen.getByText("Dr. Sharma will see you in 10 minutes.");
    expect(chip).toBeInTheDocument();
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledWith("Dr. Sharma will see you in 10 minutes.");
  });

  it("renders ConversationDetail with patient info, handback button, and handles send", () => {
    const onSendMessage = vi.fn();
    const onHandBack = vi.fn();

    render(
      <ConversationDetail
        conversation={mockConversation}
        onSendMessage={onSendMessage}
        onHandBack={onHandBack}
      />
    );

    expect(screen.getByText("सुनीता देवी (Sunita Devi)")).toBeInTheDocument();
    expect(screen.getByText(/Staff Takeover Active/)).toBeInTheDocument();

    // Test handback button
    const handbackBtn = screen.getByRole("button", { name: /hand back to bot/i });
    expect(handbackBtn).toBeInTheDocument();
    fireEvent.click(handbackBtn);
    expect(onHandBack).toHaveBeenCalled();

    // Test send message input
    const input = screen.getByPlaceholderText(/reply in english, hindi/i);
    fireEvent.change(input, { target: { value: "Hello from staff" } });
    const sendBtn = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendBtn);
    expect(onSendMessage).toHaveBeenCalledWith("Hello from staff");
  });
});
