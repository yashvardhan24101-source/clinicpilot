"use client";

import React from "react";
import { Activity } from "lucide-react";

export interface SymptomCategory {
  id: string;
  name: string;
  specialty: string;
  queryHint: string;
  icon: string;
  badgeColor?: string;
}

export const POPULAR_SYMPTOMS: SymptomCategory[] = [
  {
    id: "all",
    name: "All Specialists",
    specialty: "all",
    queryHint: "",
    icon: "🩺",
  },
  {
    id: "dental",
    name: "Toothache & Cavities",
    specialty: "Dentist",
    queryHint: "toothache",
    icon: "🦷",
  },
  {
    id: "fever",
    name: "Viral Fever & Cold",
    specialty: "General Physician",
    queryHint: "fever",
    icon: "🌡️",
  },
  {
    id: "skin",
    name: "Skin Rash & Acne",
    specialty: "Dermatologist",
    queryHint: "acne",
    icon: "🧴",
  },
  {
    id: "heart",
    name: "Chest Pain & BP",
    specialty: "Cardiologist",
    queryHint: "blood pressure",
    icon: "🫀",
  },
  {
    id: "ortho",
    name: "Joint & Back Pain",
    specialty: "Orthopedic",
    queryHint: "knee pain",
    icon: "🦴",
  },
  {
    id: "pediatric",
    name: "Child Health & Vaccines",
    specialty: "Pediatrician",
    queryHint: "vaccines",
    icon: "👶",
  },
  {
    id: "ent",
    name: "Ear, Nose & Throat",
    specialty: "ENT",
    queryHint: "sinus",
    icon: "👂",
  },
];

interface SymptomsStripProps {
  selectedSpecialty: string;
  onSelectSpecialty: (specialty: string) => void;
}

export const SymptomsStrip: React.FC<SymptomsStripProps> = ({
  selectedSpecialty,
  onSelectSpecialty,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-signal" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
            Browse by Health Concern or Specialty
          </h2>
        </div>
        {selectedSpecialty !== "all" && (
          <button
            onClick={() => onSelectSpecialty("all")}
            className="text-xs font-semibold text-signal hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Horizontal pill list with smooth horizontal scrolling */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-line no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {POPULAR_SYMPTOMS.map((item) => {
          const isActive =
            (item.specialty === "all" && selectedSpecialty === "all") ||
            (item.specialty !== "all" &&
              selectedSpecialty.toLowerCase().includes(item.specialty.toLowerCase()));

          return (
            <button
              key={item.id}
              onClick={() => onSelectSpecialty(item.specialty)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                isActive
                  ? "bg-signal text-white border-signal shadow-sm font-bold scale-[1.02]"
                  : "bg-surface-1 text-ink-muted border-line hover:border-signal/40 hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span className="text-sm leading-none">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
