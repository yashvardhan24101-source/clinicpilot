import React from "react";
import { requirePageSession } from "@/lib/auth-guard";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  await requirePageSession(["super_admin"]);
  return <AdminClient />;
}
