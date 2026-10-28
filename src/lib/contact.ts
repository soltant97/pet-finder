import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const messageSchema = z.string().trim().min(1, "Skriv ett meddelande.").max(2000, "Högst 2000 tecken.");
export const uuidSchema = z.string().uuid();
export const requestStatusLabel: Record<string, string> = { pending: "Väntar på svar", accepted: "Accepterad", declined: "Avböjd", cancelled: "Återkallad" };
export const notificationLabel: Record<string, string> = { request: "Ny kontaktförfrågan", accepted: "Din förfrågan har accepterats", declined: "Din förfrågan har avböjts", message: "Nytt meddelande" };
export function contactReturn(value: unknown): string | undefined {
  return typeof value === "string" && /^\/djur\/[0-9a-f-]{36}$/i.test(value) && uuidSchema.safeParse(value.slice(6)).success ? value : undefined;
}
export function timestamp(value: string) {
  return new Date(value).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function contactError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return /^(Du |Skriv |Djuret |Kontakten |Ni |Förfrågan |Åtgärden |Samtalet )/.test(message) ? message : "Kunde inte slutföra åtgärden. Försök igen.";
}
export async function contactData(userId: string) {
  const [requests, conversations, notifications, blocks] = await Promise.all([
    supabase.from("contact_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("conversations").select("*").order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
  ]);
  for (const result of [requests, conversations, notifications, blocks]) if (result.error) throw result.error;
  return { requests: requests.data ?? [], conversations: conversations.data ?? [], notifications: notifications.data ?? [], blocks: blocks.data ?? [] };
}