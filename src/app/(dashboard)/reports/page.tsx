import React from "react";
import { requirePageSession } from "@/lib/auth-guard";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  await requirePageSession(["owner", "doctor"]);
  return <ReportsClient />;
}
