"use client";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 text-sm">
      Loading map...
    </div>
  ),
});

type Place = {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  rating: string;
  distance: string;
  distanceNum: number;
  emoji: string;
  status: "Open" | "Closing soon" | "Unknown";
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  cuisine?: string;
  openingHours?: string;
  website?: string;
};

type Coords = { lat: number; lng: number };

const MOODS = ["Cozy & Quiet", "Focused Work", "Lively & Social", "Outdoor Escape", "Date Night", "Quick Bite"];
const MOOD_PLACEHOLDERS: Record<string, string> = {
  "Cozy & Quiet": "Find a peaceful café for focused work tonight...",
  "Focused Work": "Best co-working spots with fast WiFi nearby...",
  "Lively & Social": "Where can I find a fun social spot tonight?",
  "Outdoor Escape": "Parks and open spaces near me right now...",
  "Date Night": "Romantic restaurants with good ambiance nearby...",
  "Quick Bite": "Fast casual spots open near me now...",
};
const SUGGESTION_PILLS = ["Café", "Restaurant", "Work Space", "Live Music", "Parks", "Nightlife"];
const CONTEXT_PILLS = ["Quiet Café", "Budget Friendly", "Family Friendly", "Date Night", "Work Friendly"];
const STATS = [
  { num: "2.4k", label: "Places indexed" },
  { num: "98%", label: "Match accuracy" },
  { num: "12k", label: "Happy explorers" },
];
const DISTANCE_OPTIONS = [
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
  { label: "2 km", value: 2000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "20 km", value: 20000 },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return { str: d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`, num: d };
}

function getEmoji(tags: Record<string, string>) {
  if (tags.amenity === "cafe") return "☕";
  if (tags.amenity === "restaurant") return "🍽️";
  if (tags.amenity === "fast_food") return "🍔";
  if (tags.amenity === "bar") return "🍺";
  if (tags.amenity === "pub") return "🍻";
  if (tags.amenity === "food_court") return "🥘";
  return "📍";
}

function buildOverpassQuery(lat: number, lng: number, searchText: string, radius: number) {
  let amenities = '["amenity"~"cafe|restaurant|fast_food|bar|pub|food_court"]';
  const lower = searchText.toLowerCase();
  if (lower.includes("cafe") || lower.includes("café") || lower.includes("coffee") || lower.includes("cozy") || lower.includes("quiet") || lower.includes("work"))
    amenities = '["amenity"~"cafe"]';
  else if (lower.includes("restaurant") || lower.includes("dinner") || lower.includes("food") || lower.includes("eat") || lower.includes("date") || lower.includes("family"))
    amenities = '["amenity"~"restaurant|food_court"]';
  else if (lower.includes("bar") || lower.includes("pub") || lower.includes("nightlife") || lower.includes("social"))
    amenities = '["amenity"~"bar|pub"]';
  else if (lower.includes("fast") || lower.includes("quick") || lower.includes("budget"))
    amenities = '["amenity"~"fast_food|food_court"]';
  return `[out:json][timeout:30];(node${amenities}(around:${radius},${lat},${lng});way${amenities}(around:${radius},${lat},${lng}););out body;>;out skel qt;`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Open: "bg-green-500/10 text-green-400 border-green-500/20",
    "Closing soon": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Unknown: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  };
  return <span className={`text-xs px-2.5 py-1 rounded-full border ${colors[status] ?? colors.Unknown}`}>{status}</span>;
}

// ── Place Detail Page ──────────────────────────────────────────────────────
function PlaceDetail({ place, userCoords, onBack }: { place: Place; userCoords: Coords | null; onBack: () => void }) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-black text-white relative overflow-hidden"
    >
      {/* Background glows */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition mb-8 group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-sm">Back to results</span>
        </button>

        {/* Place header */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[28px] p-8 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
                {place.emoji}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{place.title}</h1>
                <p className="text-neutral-400 text-sm mt-1">{place.address}</p>
              </div>
            </div>
            <StatusBadge status={place.status} />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-xs text-neutral-500 mb-1">Distance</p>
              <p className="text-base font-semibold text-blue-400">📏 {place.distance}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-xs text-neutral-500 mb-1">Type</p>
              <p className="text-base font-semibold text-white capitalize">{place.tags[0] ?? "Place"}</p>
            </div>
            {place.cuisine && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-xs text-neutral-500 mb-1">Cuisine</p>
                <p className="text-base font-semibold text-white capitalize">{place.cuisine}</p>
              </div>
            )}
            {place.rating !== "—" && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-xs text-neutral-500 mb-1">Rating</p>
                <p className="text-base font-semibold text-yellow-400">★ {place.rating}</p>
              </div>
            )}
          </div>

          {/* Extra details */}
          <div className="mt-6 space-y-2">
            {place.phone && (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="text-neutral-500 w-5">📞</span>
                <span>{place.phone}</span>
              </div>
            )}
            {place.openingHours && (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="text-neutral-500 w-5">🕐</span>
                <span>{place.openingHours}</span>
              </div>
            )}
            {place.website && (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="text-neutral-500 w-5">🌐</span>
                <a href={place.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{place.website}</a>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {place.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs text-blue-300 capitalize">
                {tag}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-8">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-sm font-medium hover:scale-[1.02] transition">
              🗺️ Open in Google Maps
            </a>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl text-sm font-medium hover:bg-white/15 transition">
              🧭 Get Directions
            </a>
          </div>
        </div>

        {/* Map section */}
        <div className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">📍 Location on Map</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</p>
            </div>
            <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full">Live</span>
          </div>
          <div className="h-[450px]">
            <Map
              places={[{ title: place.title, lat: place.lat, lng: place.lng, emoji: place.emoji }]}
              center={{ lat: place.lat, lng: place.lng }}
              zoom={17}
            />
          </div>
        </div>

        {/* User location note */}
        {userCoords && (
          <p className="text-xs text-neutral-600 text-center mt-6">
            Your location: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)} · {place.distance} from this place
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────
export default function Home() {
  const [entered, setEntered] = useState(false);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMood, setActiveMood] = useState("Cozy & Quiet");
  const [places, setPlaces] = useState<Place[]>([]);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [selectedRadius, setSelectedRadius] = useState(2000);
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const fetchRealPlaces = async (coords: Coords, searchText: string, radius: number) => {
    const query = buildOverpassQuery(coords.lat, coords.lng, searchText, radius);
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.elements.filter((el: any) => el.tags && el.tags.name).map((el: any, i: number) => {
      const lat = el.lat ?? el.center?.lat ?? coords.lat;
      const lng = el.lon ?? el.center?.lon ?? coords.lng;
      const t = el.tags;
      const dist = getDistanceKm(coords.lat, coords.lng, lat, lng);
      const tagList = [
        t.amenity ? t.amenity.replace("_", " ") : null,
        t.cuisine ? t.cuisine.split(";")[0] : null,
        t["diet:vegetarian"] === "yes" ? "Vegetarian" : null,
        t.outdoor_seating === "yes" ? "Outdoor seating" : null,
        t.wifi === "yes" || t["internet_access"] === "wlan" ? "WiFi" : null,
      ].filter(Boolean) as string[];
      return {
        id: i, title: t.name,
        desc: [t.description, t.cuisine ? `Cuisine: ${t.cuisine.replace(";", ", ")}` : null, t.phone ? `📞 ${t.phone}` : null].filter(Boolean).join(" · ") || `A ${t.amenity?.replace("_", " ") ?? "place"} near you.`,
        tags: tagList.length ? tagList : [t.amenity ?? "place"],
        rating: t["stars"] ?? "—",
        distance: dist.str, distanceNum: dist.num,
        emoji: getEmoji(t), status: t.opening_hours ? "Open" : "Unknown" as Place["status"],
        lat, lng,
        address: [t["addr:street"], t["addr:city"]].filter(Boolean).join(", ") || "Nearby",
        phone: t.phone, cuisine: t.cuisine, openingHours: t.opening_hours, website: t.website,
      } as Place;
    });
  };

  const fetchCityName = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      setLocationCity(data.address?.city || data.address?.town || data.address?.village || "your area");
    } catch { setLocationCity("your area"); }
  };

  const handleSearch = () => {
    if (!search.trim()) return;
    setLoading(true); setShowResults(false); setLocationError(""); setSelectedPlace(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        await fetchCityName(coords.lat, coords.lng);
        try {
          const results = await fetchRealPlaces(coords, search, selectedRadius);
          setPlaces(results); setShowResults(true);
        } catch { setLocationError("Could not fetch places. Please try again."); }
        setLoading(false);
      },
      () => { setLoading(false); setLocationError("Location access denied. Please allow location in your browser settings."); },
      { timeout: 10000 }
    );
  };

  const sortedPlaces = [...places].sort((a, b) =>
    sortBy === "distance" ? a.distanceNum - b.distanceNum : a.title.localeCompare(b.title)
  );

  // Show place detail page
  if (selectedPlace) {
    return (
      <AnimatePresence>
        <PlaceDetail
          place={selectedPlace}
          userCoords={userCoords}
          onBack={() => setSelectedPlace(null)}
        />
      </AnimatePresence>
    );
  }

  // Email gate
  if (!entered) {
    return (
      <main className="min-h-screen bg-black text-white overflow-hidden relative flex items-center justify-center px-6">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        </div>
        <motion.div animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -80, 40, 0], y: [0, 60, -40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="relative z-10 w-full max-w-xl">
          <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm text-neutral-400 tracking-wide">EARLY ACCESS</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">NearYou AI</h1>
            <p className="mt-5 text-neutral-400 text-lg">Personalized local discovery powered by context, memory, and intent.</p>
            <div className="mt-10">
              <input type="email" placeholder="Enter your email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setEntered(true); else alert("Please enter a valid email"); } }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none text-white placeholder:text-neutral-500 focus:border-blue-400 transition" />
            </div>
            <button onClick={() => { if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setEntered(true); else alert("Please enter a valid email"); }}
              className="mt-5 w-full bg-white text-black rounded-2xl py-4 font-medium hover:scale-[1.02] transition-all duration-300">
              Continue →
            </button>
            <p className="mt-5 text-center text-xs text-neutral-500">Experimental AI experience preview</p>
          </div>
        </motion.div>
      </main>
    );
  }

  // Main app
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-32 left-20 text-4xl opacity-[0.04] pointer-events-none">📍</motion.div>
      <motion.div animate={{ y: [0, -25, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-40 right-24 text-4xl opacity-[0.04] pointer-events-none">📍</motion.div>
      <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-40 left-20 text-5xl opacity-10 pointer-events-none">☕</motion.div>
      <motion.div animate={{ y: [0, -15, 0], rotate: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-32 right-20 text-5xl opacity-10 pointer-events-none">🍽️</motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Real places · Worldwide · Powered by OpenStreetMap
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-4xl">
          NearYou <span className="text-blue-400">AI.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.3 }}
          className="mt-4 max-w-2xl text-base md:text-xl text-neutral-400">
          Discover real cafés & restaurants near you — anywhere in the world.
        </motion.p>
        <p className="mt-3 text-neutral-600 text-xs tracking-wide">Created by Ashley Johnson</p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mt-8 flex gap-8 md:gap-16 flex-wrap justify-center">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-semibold">{s.num}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="mt-10 w-full max-w-3xl">
          <div className="relative group">
            <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-cyan-500/40 blur opacity-60 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-black/60 border border-white/10 backdrop-blur-2xl rounded-[32px] p-6">
              <motion.div animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Context Search</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {MOODS.map((mood) => (
                  <button key={mood} onClick={() => setActiveMood(mood)}
                    className={`px-4 py-1.5 rounded-full text-xs border transition-all duration-200 ${activeMood === mood ? "bg-blue-500/20 border-blue-400/50 text-blue-300" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"}`}>
                    {mood}
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <p className="text-xs text-neutral-500 mb-2 text-left">📏 Search radius</p>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setSelectedRadius(opt.value)}
                      className={`px-4 py-1.5 rounded-full text-xs border transition-all duration-200 ${selectedRadius === opt.value ? "bg-purple-500/20 border-purple-400/50 text-purple-300" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder={MOOD_PLACEHOLDERS[activeMood]} value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="w-full bg-transparent outline-none text-xl text-white placeholder:text-neutral-500" />
              <button onClick={handleSearch}
                className="mt-6 w-full rounded-2xl bg-white text-black py-4 font-medium hover:scale-[1.01] hover:bg-neutral-100 active:scale-[0.99] transition-all duration-200">
                🔍 Find Real Places Near Me →
              </button>
              <div className="flex flex-wrap gap-2 mt-5">
                {SUGGESTION_PILLS.map((item) => (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={item} onClick={() => setSearch(item)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-300 hover:bg-white/10 transition">
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {CONTEXT_PILLS.map((item) => (
            <motion.button whileHover={{ scale: 1.05 }} key={item} onClick={() => setSearch(item)}
              className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-300 backdrop-blur-lg hover:text-neutral-200 transition">
              {item}
            </motion.button>
          ))}
        </div>

        {locationError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-6 px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 max-w-lg">
            ⚠️ {locationError}
          </motion.div>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-14 flex flex-col items-center gap-5">
              <div className="w-16 h-16 border-4 border-white/10 border-t-blue-400 rounded-full animate-spin" />
              <div className="text-center">
                <h3 className="text-2xl font-semibold">Finding real places near you...</h3>
                <p className="mt-2 text-neutral-400 text-sm">
                  Searching within <span className="text-blue-400">{DISTANCE_OPTIONS.find(d => d.value === selectedRadius)?.label}</span> on OpenStreetMap.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResults && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="mt-14 w-full max-w-5xl text-left">

              <div className="flex flex-wrap items-center justify-between gap-4 mb-5 px-1">
                <div>
                  <h2 className="text-base font-medium text-neutral-300">
                    Real places in <span className="text-white">{locationCity}</span> matching <span className="text-blue-400">&ldquo;{search}&rdquo;</span>
                  </h2>
                  <p className="text-xs text-neutral-600 mt-1">Within {DISTANCE_OPTIONS.find(d => d.value === selectedRadius)?.label} · {sortedPlaces.length} found · <span className="text-neutral-500">Click any card to view on map</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Sort:</span>
                  <button onClick={() => setSortBy("distance")} className={`px-3 py-1.5 rounded-full text-xs border transition ${sortBy === "distance" ? "bg-blue-500/20 border-blue-400/40 text-blue-300" : "bg-white/5 border-white/10 text-neutral-400"}`}>Nearest first</button>
                  <button onClick={() => setSortBy("name")} className={`px-3 py-1.5 rounded-full text-xs border transition ${sortBy === "name" ? "bg-blue-500/20 border-blue-400/40 text-blue-300" : "bg-white/5 border-white/10 text-neutral-400"}`}>A → Z</button>
                </div>
              </div>

              {sortedPlaces.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="mb-2">No places found within {DISTANCE_OPTIONS.find(d => d.value === selectedRadius)?.label}.</p>
                  <p className="text-sm text-neutral-600">Try increasing the search radius to 5 km or 10 km.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {sortedPlaces.map((place, i) => (
                    <motion.div key={place.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.03, y: -3 }}
                      onClick={() => { setSelectedPlace(place); window.scrollTo(0, 0); }}
                      className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[24px] overflow-hidden hover:border-blue-400/40 transition-all duration-300 cursor-pointer group relative"
                    >
                      {/* Click hint */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                        <span className="text-xs bg-blue-500/80 text-white px-2 py-1 rounded-full">View on map →</span>
                      </div>

                      <div className="h-20 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-between px-5">
                        <span className="text-4xl">{place.emoji}</span>
                        <div className="flex flex-col items-end gap-1">
                          {place.rating !== "—" && <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">★ {place.rating}</span>}
                          <StatusBadge status={place.status} />
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-base font-semibold text-white truncate mb-1">{place.title}</h3>
                        <p className="text-xs text-neutral-400 leading-relaxed mb-1 line-clamp-2">{place.desc}</p>
                        <p className="text-xs text-neutral-600 mb-1">📍 {place.address}</p>
                        <p className="text-xs text-blue-400 font-medium mb-4">📏 {place.distance} away</p>
                        <div className="flex flex-wrap gap-2">
                          {place.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs text-blue-300 capitalize">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="text-center text-neutral-600 text-xs pb-8">
        Created by Ashley Johnson · NearYou AI · Powered by OpenStreetMap
      </footer>
    </main>
  );
}