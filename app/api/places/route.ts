import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { lat, lng } = await req.json();

  const query = `
    [out:json];
    (
      node["amenity"="cafe"](around:5000,${lat},${lng});
      node["amenity"="restaurant"](around:5000,${lat},${lng});
    );
    out;
  `;

  const response = await fetch(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      body: query,
    }
  );

  const data = await response.json();

  return NextResponse.json(data.elements);
}