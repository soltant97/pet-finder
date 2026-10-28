import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { contactError, messageSchema, requestStatusLabel } from "@/lib/contact";

export function ContactOwner({ petId }: { petId: string }) {
  const { session, ready } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const request = useQuery({
    queryKey: ["contact", "pet", petId, session?.user.id], enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_requests").select("*").eq("pet_id", petId).eq("finder_id", session?.user.id ?? "").in("status", ["pending", "accepted"]).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const ownership = useQuery({ queryKey: ["contact", "own-pet", petId, session?.user.id], enabled: !!session, queryFn: async () => {
    const { data, error } = await supabase.from("pets").select("id").eq("id", petId).maybeSingle();
    if (error) throw error;
    return !!data;
  } });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    setBusy(true); setError(undefined);
    const { error } = await supabase.rpc("create_contact_request", { _pet_id: petId, _introduction: parsed.data });
    setBusy(false);
    if (error) { setError(contactError(error)); return; }
    setBody(""); setOpen(false);
    await qc.invalidateQueries({ queryKey: ["contact"] });
    toast.success("Din kontaktförfrågan har skickats.");
  }
  if (!ready) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (ownership.data) return <p className="text-sm text-muted-foreground">Det här är ditt djur. Kontaktförfrågningar finns under Meddelanden.</p>;
  return <section className="space-y-4 border-t pt-5">
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Kontaktuppgifter visas aldrig automatiskt.</p>
    {request.data ? <><p className="font-semibold">{requestStatusLabel[request.data.status]}</p><Button asChild variant="outline"><Link to="/meddelanden" search={{ request: request.data.id }}>Visa förfrågan</Link></Button></> : <>
      <Button onClick={() => setOpen(true)} disabled={!!session && (request.isLoading || ownership.isLoading)}><MessageCircle /> Kontakta ägaren</Button>
      {(request.isError || ownership.isError) && <p className="text-sm text-destructive">Kunde inte kontrollera tidigare förfrågningar. Försök igen.</p>}
      {open && !session && <div className="space-y-3"><p className="text-sm">Du behöver ett konto för att kontakta ägaren. Efter inloggningen kommer du tillbaka till djuret.</p><div className="flex flex-wrap gap-2"><Button asChild><Link to="/auth" search={{ redirect: `/djur/${petId}`, mode: "login" }}>Logga in</Link></Button><Button asChild variant="outline"><Link to="/auth" search={{ redirect: `/djur/${petId}`, mode: "signup" }}>Skapa konto</Link></Button></div></div>}
      {open && session && <form onSubmit={submit} className="space-y-3"><Field label="Meddelande till ägaren" htmlFor="introduction" error={error}><Textarea id="introduction" value={body} maxLength={2000} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="Berätta varför du tror att du har hittat djuret." /></Field><p className="text-xs text-muted-foreground">Ett privat samtal öppnas först när ägaren accepterar din förfrågan.</p><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Skicka förfrågan</Button></form>}
    </>}
  </section>;
}