import React from "react";
import { requirePageSession } from "@/lib/auth-guard";
import BillingClient from "./billing-client";

export default async function BillingPage() {
  await requirePageSession(["owner", "super_admin"]);
  return <BillingClient />;
}
