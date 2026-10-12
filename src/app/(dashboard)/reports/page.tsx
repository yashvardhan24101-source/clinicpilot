"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Send,
  CheckCircle2,
  Eye,
  FileCheck,
  Search,
  Filter,
  Sparkles,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Row } from "@/components/ui/row";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/utils";
import { LabReport, Patient } from "@/types/api";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<LabReport | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New report form state
  const [newTitle, setNewTitle] = useState("");
  const [newPatientId, setNewPatientId] = useState("");
  const [newCategory, setNewCategory] = useState<LabReport["category"]>("x_ray");
  const [newFileName, setNewFileName] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.getReports(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.getPatients(),
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (data: Partial<LabReport>) => api.createReport(data),
    onSuccess: (rep) => {
      setIsUploadOpen(false);
      setNewTitle("");
      setNewFileName("");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setNotification(`Uploaded ${rep.title} successfully.`);
      setTimeout(() => setNotification(null), 4000);
    },
  });

  // Send WhatsApp Mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: (id: string) => api.sendReportToWhatsApp(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setNotification(res.message);
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.file_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === newPatientId) || patients[0];
    uploadMutation.mutate({
      title: newTitle.trim(),
      patient_id: patient?.id,
      patient_name: patient?.name,
      category: newCategory,
      file_name: newFileName.trim() || `${newTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      file_size: "1.8 MB",
    });
  };

  const categoryLabels: Record<string, string> = {
    x_ray: "Dental X-Ray",
    scan: "CT / Cephalometric Scan",
    blood_test: "Pathology / Blood",
    prescription: "Prescription & Rx",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
            <FileCheck className="h-3.5 w-3.5 text-signal" />
            <span>Digital Diagnostic Records</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
            Lab Reports &amp; Dental PDFs
          </h2>
        </div>

        <Button
          onClick={() => {
            if (patients.length > 0 && !newPatientId) {
              setNewPatientId(patients[0].id);
            }
            setIsUploadOpen(true);
          }}
          className="gap-2 shadow-sm shrink-0"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Report PDF</span>
        </Button>
      </div>

      {/* Success Notification */}
      {notification && (
        <div className="p-3 rounded-xl bg-ok-subtle border border-ok/30 text-xs font-semibold text-ok flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface-1 rounded-2xl border border-line p-3 sm:p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
            <Input
              placeholder="Search reports by title, patient or filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <option value="all">All Diagnostic Categories</option>
            <option value="x_ray">Dental X-Rays (OPG, Bitewings)</option>
            <option value="scan">Cephalometric &amp; CT Scans</option>
            <option value="blood_test">Pathology &amp; Blood Tests</option>
            <option value="prescription">Prescriptions &amp; Charts</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle bg-surface-2/30 text-xs font-semibold text-ink-soft font-display">
          <span>Diagnostic Documents ({filteredReports.length})</span>
          <span>Click to preview or dispatch to WhatsApp</span>
        </div>

        <div className="divide-y divide-line-subtle">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-ink-soft">Loading documents...</div>
          ) : filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Row
                key={report.id}
                className="hover:bg-surface-2/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-subtle text-signal">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-ink truncate">
                        {report.title}
                      </h4>
                      <span className="px-2 py-0.2 rounded-md bg-surface-2 text-[10px] font-semibold text-ink-soft uppercase font-display">
                        {categoryLabels[report.category] || report.category}
                      </span>
                    </div>

                    <p className="text-xs text-ink-soft truncate mt-0.5">
                      Patient: <strong className="text-ink font-devanagari">{report.patient_name}</strong> •{" "}
                      <span>{report.file_name}</span> ({report.file_size})
                    </p>

                    <p className="text-[11px] text-ink-faint mt-0.5 font-display">
                      Uploaded on {formatDateDisplay(report.uploaded_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewReport(report)}
                    className="h-8 text-xs gap-1"
                    title="View PDF Document Preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={report.sent_to_whatsapp ? "outline" : "default"}
                    onClick={() => sendWhatsAppMutation.mutate(report.id)}
                    disabled={sendWhatsAppMutation.isPending}
                    className="h-8 text-xs gap-1.5"
                    title="Send PDF to patient WhatsApp"
                  >
                    {report.sent_to_whatsapp ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                        <span className="text-ok font-semibold">Resend</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send WhatsApp</span>
                      </>
                    )}
                  </Button>
                </div>
              </Row>
            ))
          ) : (
            <div className="p-12 text-center space-y-2">
              <FileText className="h-8 w-8 text-ink-faint mx-auto" />
              <p className="text-sm font-medium text-ink">No diagnostic reports found.</p>
              <p className="text-xs text-ink-soft">
                Upload dental X-rays or PDF lab reports to share with patients via WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Report Sheet Modal */}
      <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <SheetContent side="bottom" className="max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle>Upload Lab Report or PDF</SheetTitle>
            <SheetDescription>
              Attach a diagnostic scan or document to a patient record.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                Report Title
              </label>
              <Input
                placeholder="e.g. Lower Jaw Panoramic X-Ray"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                Patient
              </label>
              <select
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal font-devanagari"
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <option value="x_ray">Dental X-Ray (OPG, Bitewings)</option>
                <option value="scan">Cephalometric &amp; CT Scan</option>
                <option value="blood_test">Pathology &amp; Blood Test</option>
                <option value="prescription">Prescription &amp; Clinical Rx</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                PDF File Name
              </label>
              <Input
                placeholder="e.g. molar_panoramic_scan.pdf"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-xl bg-surface-2/60 border border-dashed border-line text-center text-xs text-ink-soft">
              Simulated PDF upload (1.8 MB). Ready to dispatch to patient on WhatsApp.
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Report PDF Preview Modal */}
      {previewReport && (
        <Sheet open={Boolean(previewReport)} onOpenChange={() => setPreviewReport(null)}>
          <SheetContent side="bottom" className="max-w-lg mx-auto">
            <SheetHeader>
              <SheetTitle>{previewReport.title}</SheetTitle>
              <SheetDescription>
                {previewReport.patient_name} • {previewReport.file_name} ({previewReport.file_size})
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="h-64 rounded-xl bg-surface-2/60 border border-line flex flex-col items-center justify-center p-6 text-center space-y-3">
                <FileText className="h-12 w-12 text-signal" />
                <div>
                  <h4 className="text-sm font-bold text-ink">{previewReport.title}</h4>
                  <p className="text-xs text-ink-soft mt-1">
                    Digital Medical Diagnostic Document • Verified by SmileCraft Dental
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-ok font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Authenticated PDF Signature Verified</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setPreviewReport(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    sendWhatsAppMutation.mutate(previewReport.id);
                    setPreviewReport(null);
                  }}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send to Patient WhatsApp</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
