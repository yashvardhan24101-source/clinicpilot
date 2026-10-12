"use client";

import React, { useState } from "react";
import { User, Phone, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Patient } from "@/types/api";

interface AddPatientSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Patient>) => void;
}

export const AddPatientSheet: React.FC<AddPatientSheetProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [language, setLanguage] = useState<"en" | "hi" | "hinglish">("en");
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      language,
      consent_status: {
        whatsapp_reminders: whatsappReminders,
        marketing,
      },
    });

    setName("");
    setPhone("+91 ");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-md mx-auto">
        <SheetHeader>
          <SheetTitle>Register New Patient</SheetTitle>
          <SheetDescription>
            Add a patient to the clinic directory and WhatsApp registry.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Full Name (English or Hindi)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
              <Input
                placeholder="e.g. Ramesh Chandra or प्रीति वर्मा"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 font-devanagari"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              WhatsApp Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
              <Input
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 font-display"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Preferred Language for WhatsApp Bot
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-surface-2/50 border border-line-subtle text-xs">
            <span className="font-semibold text-ink font-display block">
              Patient WhatsApp Consent
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappReminders}
                onChange={(e) => setWhatsappReminders(e.target.checked)}
                className="rounded border-line text-signal focus:ring-signal"
              />
              <span className="text-ink-soft">Consent to appointment alerts &amp; bills</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="rounded border-line text-signal focus:ring-signal"
              />
              <span className="text-ink-soft">Consent to checkup recalls &amp; dental tips</span>
            </label>
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Patient</span>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
