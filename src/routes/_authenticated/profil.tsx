import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppHeader";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil – DjurHittaren" },
      { name: "description", content: "Ditt användarnamn på DjurHittaren." },
      { property: "og:title", content: "Profil – DjurHittaren" },
      { property: "og:description", content: "Ditt användarnamn på DjurHittaren." },
    ],
  }),
  component: ProfilePage,
});

const RE = /^[A-Za-z0-9_]{3,24}$/;

function ProfilePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [name, setName] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const value = name ?? q.data?.username ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!RE.test(v)) return setErr("3–24 tecken: bokstäver A–Z, siffror och understreck");
    if (v === q.data?.username) return setErr("");
    setBusy(true);
    const { data: free } = await supabase.rpc("is_username_available", { _username: v });
    if (!free) {
      setBusy(false);
      return setErr("Användarnamnet är upptaget");
    }
    const { error } = await supabase.from("profiles").update({ username: v }).eq("id", q.data!.id);
    setBusy(false);
    if (error) return setErr(error.code === "23505" ? "Användarnamnet är upptaget" : "Kunde inte spara");
    setErr("");
    setName(null);
    toast.success("Användarnamnet är uppdaterat");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function shuffle() {
    const words = ["Luna", "Sol", "Moln", "Bris", "Skog", "Ek", "Bjork", "Vind", "Sno", "Rav", "Uggla", "Hare", "Lind", "Mossa"];
    setName(words[Math.floor(Math.random() * words.length)] + String(Math.floor(Math.random() * 10000)).padStart(4, "0"));
    setErr("");
  }

  return (
    <PageShell title="Profil" subtitle="Ditt användarnamn är det enda andra kan se. Använd inte ditt riktiga namn eller andra personuppgifter.">
      <form onSubmit={save} className="surface max-w-lg space-y-4 p-5 sm:p-8">
        <Field label="Användarnamn" htmlFor="u" error={err} hint="3–24 tecken: bokstäver, siffror och understreck">
          <div className="flex gap-2">
            <Input id="u" value={value} onChange={(e) => setName(e.target.value)} maxLength={24} disabled={q.isLoading} />
            <Button type="button" variant="outline" size="icon" onClick={shuffle} aria-label="Slumpa nytt namn"><Shuffle /></Button>
          </div>
        </Field>
        <Button type="submit" disabled={busy || q.isLoading}>{busy && <Loader2 className="animate-spin" />} Spara</Button>
      </form>
    </PageShell>
  );
}
