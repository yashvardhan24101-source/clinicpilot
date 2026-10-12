import { redirect } from "next/navigation";

export default function RootHomePage() {
  // Real customers are clinic staff who open the app repeatedly every day.
  // Direct them straight to the front-desk operations dashboard (/today).
  redirect("/today");
}
