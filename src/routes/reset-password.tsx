import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nytt lösenord – DjurHittaren" },
      { name: "description", content: "Välj ett nytt lösenord för ditt konto." },
      { property: "og:title", content: "Nytt lösenord – DjurHittaren" },
      { property: "og:description", content: "Välj ett nytt lösenord för ditt konto." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Minst 8 tecken");
    if (pw !== pw2) return setErr("Lösenorden matchar inte");
    setErr("");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error("Kunde inte byta lösenord. Länken kan ha gått ut.");
    toast.success("Lösenordet är uppdaterat");
    navigate({ to: "/oversikt", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-10">
      <div className="surface w-full p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Välj nytt lösenord</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Öppna länken från e-postmeddelandet för att byta lösenord.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Nytt lösenord" htmlFor="pw"><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field label="Upprepa lösenord" htmlFor="pw2" error={err}><Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Spara lösenord</Button>
          </form>
        )}
      </div>
    </main>
  );
}
