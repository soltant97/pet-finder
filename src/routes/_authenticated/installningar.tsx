import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppHeader";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/installningar")({
  head: () => ({
    meta: [
      { title: "Inställningar – DjurHittaren" },
      { name: "description", content: "Kontoinställningar." },
      { property: "og:title", content: "Inställningar – DjurHittaren" },
      { property: "og:description", content: "Kontoinställningar." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const user = useQuery({ queryKey: ["auth-user"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Det nya lösenordet måste ha minst 8 tecken");
    const email = user.data?.email;
    if (!email) return;
    setBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: cur });
    if (authErr) {
      setBusy(false);
      return setErr("Nuvarande lösenord stämmer inte");
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr("Kunde inte byta lösenord. Prova ett starkare lösenord.");
    setErr("");
    setCur("");
    setPw("");
    toast.success("Lösenordet är bytt");
  }

  return (
    <PageShell title="Inställningar">
      <div className="max-w-lg space-y-6">
        <section className="surface p-5 sm:p-8">
          <h2 className="text-xl font-semibold">Konto</h2>
          <p className="mt-1 text-sm text-muted-foreground">Din e-postadress är privat och visas aldrig för andra.</p>
          <p className="mt-4 text-sm font-medium">{user.data?.email ?? "…"}</p>
        </section>
        <form onSubmit={save} className="surface space-y-4 p-5 sm:p-8">
          <h2 className="text-xl font-semibold">Byt lösenord</h2>
          <Field label="Nuvarande lösenord" htmlFor="cur"><Input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label="Nytt lösenord" htmlFor="pw" error={err}><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Spara</Button>
        </form>
      </div>
    </PageShell>
  );
}
