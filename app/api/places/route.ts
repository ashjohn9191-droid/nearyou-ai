import { NextRequest, NextResponse } from "next/server";

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;

// Map our search intent to Geoapify place categories
// Full category list: https://apidocs.geoapify.com/docs/places/#categories
function getCategories(searchText: string): string {
  const lower = searchText.toLowerCase();

  if (
    lower.includes("cafe") || lower.includes("café") || lower.includes("coffee") ||
    lower.includes("cozy") || lower.includes("quiet") || lower.includes("work")
  ) {
    return "catering.cafe";
  }
  if (
    lower.includes("bar") || lower.includes("pub") || lower.includes("nightlife") || lower.includes("social")
  ) {
    return "catering.bar,catering.pub";
  }
  if (lower.includes("fast") || lower.includes("quick") || lower.includes("budget")) {
    return "catering.fast_food";
  }
  if (lower.includes("park") || lower.includes("outdoor")) {
    return "leisure.park";
  }
  // default: restaurants + cafes
  return "catering.restaurant,catering.cafe";
}

export async function POST(req: NextRequest) {
  try {
    if (!GEOAPIFY_KEY) {
      return NextResponse.json(
        { error: "Server is missing GEOAPIFY_API_KEY. Add it in Vercel environment variables." },
        { status: 500 }
      );
    }

    const { lat, lng, searchText, radius } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Missing or invalid coordinates" }, { status: 400 });
    }

    const categories = getCategories(searchText ?? "");
    const safeRadius = Math.min(Math.max(radius ?? 2000, 100), 50000); // clamp 100m–50km

    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
      categories
    )}&filter=circle:${lng},${lat},${safeRadius}&bias=proximity:${lng},${lat}&limit=20&apiKey=${GEOAPIFY_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Geoapify returned ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}