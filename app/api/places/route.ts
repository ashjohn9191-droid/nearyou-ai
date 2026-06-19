import { NextRequest, NextResponse } from "next/server";

function buildOverpassQuery(lat: number, lng: number, searchText: string, radius: number) {
  let amenities = '["amenity"~"cafe|restaurant|fast_food|bar|pub|food_court"]';
  const lower = searchText.toLowerCase();
  if (
    lower.includes("cafe") || lower.includes("café") || lower.includes("coffee") ||
    lower.includes("cozy") || lower.includes("quiet") || lower.includes("work")
  ) {
    amenities = '["amenity"~"cafe"]';
  } else if (
    lower.includes("restaurant") || lower.includes("dinner") || lower.includes("food") ||
    lower.includes("eat") || lower.includes("date") || lower.includes("family")
  ) {
    amenities = '["amenity"~"restaurant|food_court"]';
  } else if (
    lower.includes("bar") || lower.includes("pub") || lower.includes("nightlife") || lower.includes("social")
  ) {
    amenities = '["amenity"~"bar|pub"]';
  } else if (lower.includes("fast") || lower.includes("quick") || lower.includes("budget")) {
    amenities = '["amenity"~"fast_food|food_court"]';
  }
  return `[out:json][timeout:25];(node${amenities}(around:${radius},${lat},${lng});way${amenities}(around:${radius},${lat},${lng}););out body;>;out skel qt;`;
}

const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, searchText, radius } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Missing or invalid coordinates" }, { status: 400 });
    }

    const query = buildOverpassQuery(lat, lng, searchText ?? "", radius ?? 2000);

    let lastError = "";

    for (const server of SERVERS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(server, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: query,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          lastError = `Server ${server} returned ${res.status}`;
          continue;
        }

        const data = await res.json();
        return NextResponse.json(data);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        continue;
      }
    }

    return NextResponse.json(
      { error: `All map servers failed. ${lastError}` },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}