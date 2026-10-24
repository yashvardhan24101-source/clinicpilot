import React from "react";
import { notFound } from "next/navigation";
import { getFeatureFlags } from "@/lib/flags";
import PatientPortalClient from "./patient-portal-client";

export default function PatientPage() {
  const flags = getFeatureFlags();
  if (!flags.patientPortal) {
    notFound();
  }
  return <PatientPortalClient />;
}
