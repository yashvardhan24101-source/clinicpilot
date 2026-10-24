import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/flags";
import { serverStore } from "@/lib/server-store";

export async function GET(request: Request) {
  const flags = getFeatureFlags();
  if (!flags.publicDoctorSearch) {
    return NextResponse.json(
      { error: "Feature Not Found: Public Doctor Search is disabled" },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const specialty = url.searchParams.get("specialty");
  const query = url.searchParams.get("q")?.toLowerCase();

  let results = [...serverStore.doctors];

  if (city && city !== "all") {
    results = results.filter((d) => d.city?.toLowerCase() === city.toLowerCase());
  }

  if (specialty && specialty !== "all") {
    results = results.filter((d) =>
      d.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (query) {
    results = results.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.specialty.toLowerCase().includes(query)
    );
  }

  return NextResponse.json(results);
}
