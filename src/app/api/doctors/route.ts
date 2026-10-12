import { NextResponse } from "next/server";
import { MOCK_DOCTORS } from "@/mocks/seed-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const specialty = url.searchParams.get("specialty");
  const query = url.searchParams.get("q")?.toLowerCase();

  let result = [...MOCK_DOCTORS];

  if (city && city !== "all") {
    result = result.filter((d) => d.city?.toLowerCase() === city.toLowerCase());
  }

  if (specialty && specialty !== "all") {
    result = result.filter((d) =>
      d.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (query) {
    result = result.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.specialty.toLowerCase().includes(query) ||
        d.clinic_name?.toLowerCase().includes(query) ||
        d.area?.toLowerCase().includes(query) ||
        d.treatments?.some((t) => t.toLowerCase().includes(query))
    );
  }

  return NextResponse.json(result);
}
