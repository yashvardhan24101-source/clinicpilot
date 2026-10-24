import React from "react";
import { notFound } from "next/navigation";
import { getFeatureFlags } from "@/lib/flags";
import { requirePageSession } from "@/lib/auth-guard";
import DoctorChamberClient from "./doctor-chamber-client";

export default async function DoctorChamberPage() {
  const flags = getFeatureFlags();
  if (!flags.doctorChamber) {
    notFound();
  }
  await requirePageSession(["doctor", "owner"]);
  return <DoctorChamberClient />;
}
