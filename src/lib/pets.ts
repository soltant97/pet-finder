import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Species = Database["public"]["Enums"]["pet_species"];
export type Sex = Database["public"]["Enums"]["pet_sex"];
export type PetStatus = Database["public"]["Enums"]["pet_status"];
export type Pet = Database["public"]["Tables"]["pets"]["Row"];
export type LostReport = Database["public"]["Tables"]["lost_reports"]["Row"];
export type PetPhoto = Database["public"]["Tables"]["pet_photos"]["Row"];

export const BUCKET = "pet-photos";

export const speciesLabel: Record<Species, string> = { katt: "Katt", hund: "Hund", annat: "Annat djur" };
export const sexLabel: Record<Sex, string> = { hane: "Hane", hona: "Hona", okant: "Okänt" };
export const statusLabel: Record<PetStatus, string> = {
  registrerad: "Registrerad",
  borttappad: "Borttappad",
  aterfunnen: "Återfunnen",
};

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `"${file.name}" är inte en JPG-, PNG- eller WebP-bild.`;
  if (file.size > MAX_FILE_BYTES) return `"${file.name}" är större än 5 MB.`;
  return null;
}

const opt = (max: number) =>
  z.string().trim().max(max, `Högst ${max} tecken`).transform((v) => (v === "" ? null : v));

export const petSchema = z.object({
  name: z.string().trim().min(1, "Ange djurets namn").max(60, "Högst 60 tecken"),
  species: z.enum(["katt", "hund", "annat"]),
  breed: opt(80),
  color: z.string().trim().min(1, "Ange färg").max(80, "Högst 80 tecken"),
  sex: z.enum(["hane", "hona", "okant"]),
  age: opt(40),
  microchip: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^[0-9A-Za-z]{6,20}$/.test(v), "6–20 siffror eller bokstäver")
    .transform((v) => (v === "" ? null : v)),
  marks: opt(500),
  description: opt(1500),
});
export type PetInput = z.input<typeof petSchema>;

export const lostSchema = z.object({
  last_location: z.string().trim().min(2, "Ange senast kända plats").max(160, "Högst 160 tecken"),
  last_seen_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ange datum")
    .refine((d) => d <= todayISO(), "Datumet kan inte vara i framtiden"),
  circumstances: z.string().trim().min(2, "Beskriv omständigheterna").max(1500, "Högst 1500 tecken"),
});
export type LostInput = z.input<typeof lostSchema>;

export function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
}

export function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}

export async function uploadPhotos(userId: string, petId: string, files: File[], startPos = 0) {
  for (const [i, file] of files.entries()) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${petId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) throw new Error("Kunde inte ladda upp bilden: " + upErr.message);
    const { error } = await supabase
      .from("pet_photos")
      .insert({ pet_id: petId, owner_id: userId, storage_path: path, position: startPos + i });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error("Kunde inte spara bilden.");
    }
  }
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.signedUrl && d.path) out[d.path] = d.signedUrl;
  });
  return out;
}

export async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Du är inte inloggad.");
  return data.user.id;
}
