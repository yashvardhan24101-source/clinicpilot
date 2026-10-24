import React from "react";
import { getFeatureFlags } from "@/lib/flags";
import MoreClient from "./more-client";

export default function MorePage() {
  const flags = getFeatureFlags();
  return <MoreClient flags={flags} />;
}
