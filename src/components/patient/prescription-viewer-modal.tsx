"use client";

import React from "react";
import { Appointment, Prescription } from "@/types/api";
import {
  X,
  Printer,
  Download,
  FileText,
  ShieldCheck,
  Stethoscope,
  Building,
  Calendar,
  User,
  CheckCircle2,
} from "lucide-react";

interface PrescriptionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export const PrescriptionViewerModal: React.FC<PrescriptionViewerModalProps> = ({
  isOpen,
  onClose,
  appointment,
}) => {
  if (!isOpen || !appointment) return null;

  const prescription: Prescription = appointment.prescription || {
    id: "rx-default",
    diagnosis: "General Dental Checkup & Scaling Recommendation",
    medicines: [
      {
        name: "Amoxicillin 500mg (Augmentin)",
        dosage: "500 mg",
        frequency: "1-0-1 (After Food)",
        duration: "5 Days",
        notes: "Complete full antibiotic course",
      },
      {
        name: "Aceclofenac + Paracetamol (Zerodol-P)",
        dosage: "100mg / 325mg",
        frequency: "1-0-1 (SOS Pain)",
        duration: "3 Days",
        notes: "Take only if pain occurs",
      },
      {
        name: "Chlorhexidine Mouthwash 0.2%",
        dosage: "10 ml",
        frequency: "Twice daily",
        duration: "7 Days",
        notes: "Rinse mouth for 30s after meals",
      },
    ],
    doctor_advice: "Brush twice daily using soft bristles. Avoid hot and sugary beverages for 48 hours. Follow up in 7 days.",
    created_at: appointment.date || new Date().toISOString(),
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-1 rounded-3xl border border-line shadow-card overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface-2/40">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-signal" />
            <span className="text-xs font-bold text-ink font-display uppercase tracking-wider">
              Digital Medical Prescription (Rx)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface-1 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5 text-signal" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-0">
          {/* Clinic Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-line">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal text-white font-display font-extrabold text-sm">
                  CP
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-ink font-display leading-none">
                    SmileCraft Dental &amp; Healthcare Hub
                  </h3>
                  <span className="text-[11px] text-ink-muted">
                    Bandra West, Mumbai • Reg: MH/MUM/2024/9912
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <span className="text-xs font-bold text-ink block">
                {appointment.doctor_name}
              </span>
              <span className="text-[11px] text-signal font-medium block">
                {appointment.service_name}
              </span>
              <span className="text-[10px] text-ink-muted block">
                Reg No: D-44821 • Indian Dental Council
              </span>
            </div>
          </div>

          {/* Patient Details Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface-2/60 border border-line text-xs">
            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase block">
                Patient Name
              </span>
              <strong className="text-ink font-display">
                {appointment.patient_name}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase block">
                Age / Gender
              </span>
              <span className="text-ink font-medium">
                {appointment.patient_age ? `${appointment.patient_age} yrs` : "Adult"} /{" "}
                {appointment.patient_gender || "Male"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase block">
                Visit Date
              </span>
              <span className="text-ink font-medium">
                {appointment.date}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase block">
                Pass / Token
              </span>
              <span className="text-signal font-bold font-display">
                #{appointment.booking_code} (Token #{appointment.token_number || 1})
              </span>
            </div>
          </div>

          {/* Clinical Diagnosis */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display block">
              Diagnosis &amp; Clinical Findings:
            </span>
            <div className="p-3 rounded-xl bg-surface-2/40 border border-line text-xs font-semibold text-ink">
              {prescription.diagnosis}
            </div>
          </div>

          {/* Rx Medications Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-signal font-display">
                ℞
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink font-display">
                Prescribed Medications
              </span>
            </div>

            <div className="rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/70 text-ink-muted font-display uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Medicine Name</th>
                    <th className="py-2.5 px-3">Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {prescription.medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-ink-muted">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-ink block">{med.name}</span>
                        {med.notes && (
                          <span className="text-[10px] text-ink-faint block">{med.notes}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-ink">{med.dosage}</td>
                      <td className="py-2.5 px-3 font-semibold text-signal">{med.frequency}</td>
                      <td className="py-2.5 px-3 font-medium text-ink">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Doctor Advice & Instructions */}
          {prescription.doctor_advice && (
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display block">
                Doctor&apos;s Advice &amp; Lifestyle Precautions:
              </span>
              <p className="p-3 rounded-xl bg-surface-2/40 border border-line text-xs text-ink-muted leading-relaxed">
                {prescription.doctor_advice}
              </p>
            </div>
          )}

          {/* Signoff Stamp */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-mint font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Clinic Record Summary</span>
            </div>

            <div className="text-right">
              <div className="inline-block border-b border-ink/40 pb-1 mb-1 font-display font-bold text-xs text-ink italic">
                {appointment.doctor_name}
              </div>
              <span className="text-[10px] text-ink-muted block">
                Authorized Signature &amp; Stamp
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-1 border border-line text-xs font-semibold text-ink hover:bg-surface-2 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:bg-signal-hover transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
