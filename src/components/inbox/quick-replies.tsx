import React from "react";
import { Sparkles } from "lucide-react";

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

const TEMPLATES = [
  "Dr. Sharma will see you in 10 minutes.",
  "नमस्ते, कृपया रिसेप्शन डेस्क पर अपना नाम दर्ज कराएं।",
  "Your prescription and bill are ready for pickup.",
  "Please share your previous dental X-rays or reports here.",
  "डॉक्टर साहब आज शाम 6:00 PM तक उपलब्ध रहेंगे।",
  "We have marked your arrival. Please take a seat.",
];

export const QuickReplies: React.FC<QuickRepliesProps> = ({ onSelect }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-3 bg-surface-2/40 border-t border-line-subtle">
      <span className="text-[11px] font-semibold text-ink-faint flex items-center gap-1 shrink-0 font-display uppercase tracking-wider pr-1">
        <Sparkles className="h-3 w-3 text-signal" />
        Quick
      </span>

      {TEMPLATES.map((tpl, i) => (
        <button
          key={i}
          onClick={() => onSelect(tpl)}
          className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border border-line bg-surface-1 text-ink-soft hover:bg-signal-subtle hover:text-signal hover:border-signal/30 transition-colors font-devanagari max-w-[260px] truncate"
          title={tpl}
        >
          {tpl}
        </button>
      ))}
    </div>
  );
};
