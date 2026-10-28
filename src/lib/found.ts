import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { BUCKET, signedUrls, type Species } from "@/lib/pets";

export type LostCandidate = Database["public"]["Functions"]["search_lost_pets"]["Returns"][number];

/**
 * Search area levels. Locations are stored as free text (no coordinates),
 * so "radius" is text-based: area → town/municipality → all of Sweden.
 */
export type SearchLevel = "omrade" | "ort" | "hela";
export const LEVELS: SearchLevel[] = ["omrade", "ort", "hela"];
export const levelLabel: Record<SearchLevel, string> = {
  omrade: "Området",
  ort: "Orten / kommunen",
  hela: "Hela Sverige",
};

export type FoundQuery = {
  species: Species | null;
  area: string;
  city: string;
  foundDate: string | null; // YYYY-MM-DD
  description: string;
};

/** First level that has a location term to search on. */
export function startLevel(q: Pick<FoundQuery, "area" | "city">): SearchLevel {
  if (q.area.trim().length >= 2) return "omrade";
  if (q.city.trim().length >= 2) return "ort";
  return "hela";
}

export function nextLevel(q: Pick<FoundQuery, "area" | "city">, l: SearchLevel): SearchLevel | null {
  const i = LEVELS.indexOf(l);
  for (const n of LEVELS.slice(i + 1)) {
    if (n === "hela" || (n === "ort" && q.city.trim().length >= 2)) return n;
  }
  return null;
}

export function termFor(q: Pick<FoundQuery, "area" | "city">, l: SearchLevel): string | null {
  if (l === "omrade") return q.area.trim();
  if (l === "ort") return q.city.trim();
  return null;
}

const STOP = new Set(["och", "med", "har", "den", "det", "som", "en", "ett", "på", "vid", "att", "är", "lite", "mycket", "liten", "stor"]);
export function tokens(s: string | null | undefined): string[] {
  return (s ?? "")
    .toLowerCase()
    .split(/[^a-zåäöé0-9]+/i)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/** Structured text similarity (no AI): which public fields share words with the finder's description. */
export function scoreCandidate(c: Pick<LostCandidate, "color" | "breed" | "marks" | "circumstances">, description: string) {
  const words = new Set(tokens(description));
  const hit = (field: string | null) => tokens(field).filter((t) => words.has(t) || [...words].some((w) => w.length >= 4 && (t.startsWith(w) || w.startsWith(t))));
  const color = hit(c.color);
  const breed = hit(c.breed);
  const marks = hit(c.marks).concat(hit(c.circumstances));
  const matched: string[] = [];
  if (color.length) matched.push("Färg");
  if (breed.length) matched.push("Ras");
  if (marks.length) matched.push("Kännetecken");
  return { score: color.length * 3 + breed.length * 2 + new Set(marks).size, matched };
}

export type Match = LostCandidate & { score: number; matched: string[]; cover?: string | undefined };

export async function searchLost(q: FoundQuery, level: SearchLevel): Promise<Match[]> {
  const { data, error } = await supabase.rpc("search_lost_pets", {
    ...(q.species ? { _species: q.species } : {}),
    ...(termFor(q, level) ? { _location_term: termFor(q, level)! } : {}),
    ...(q.foundDate ? { _found_date: q.foundDate } : {}),
  });
  if (error) throw new Error("Sökningen misslyckades. Kontrollera din anslutning och försök igen.");
  const covers = data.map((p) => p.photo_paths[0]).filter((x): x is string => !!x);
  let urls: Record<string, string> = {};
  try {
    urls = await signedUrls(covers);
  } catch {
    /* photos missing → cards show placeholder */
  }
  return data
    .map((p) => ({ ...p, ...scoreCandidate(p, q.description), cover: p.photo_paths[0] ? urls[p.photo_paths[0]] : undefined }))
    .sort((a, b) => b.score - a.score || b.last_seen_date.localeCompare(a.last_seen_date));
}

/**
 * Turn device coordinates into area + town names via OpenStreetMap Nominatim (free, no key).
 * Coordinates are used only for this lookup and never stored.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ area: string; city: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=sv&lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geo");
  const j = (await res.json()) as { address?: Record<string, string> };
  const a = j.address ?? {};
  const area = a["suburb"] ?? a["neighbourhood"] ?? a["quarter"] ?? a["city_district"] ?? a["village"] ?? "";
  const city = a["city"] ?? a["town"] ?? a["municipality"] ?? a["village"] ?? "";
  if (!area && !city) throw new Error("geo");
  return { area, city: city.replace(/ kommun$/i, "") };
}

/** Signed-in finders: keep a private copy of the report and photos (only the finder can read them). */
export async function saveFoundReport(userId: string, q: FoundQuery, files: File[], foundAt: string | null) {
  const id = crypto.randomUUID();
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/found/${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw new Error("Kunde inte ladda upp bilden.");
    paths.push(path);
  }
  const { error } = await supabase.from("found_reports").insert({
    id,
    finder_id: userId,
    species: q.species,
    area: q.area.trim() || null,
    city: q.city.trim() || null,
    found_at: foundAt,
    description: q.description.trim() || null,
    photo_paths: paths,
  });
  if (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    throw new Error("Kunde inte spara anmälan.");
  }
}
