import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in – DjurHittaren" },
      { name: "description", content: "Logga in eller skapa ett konto på DjurHittaren." },
      { property: "og:title", content: "Logga in – DjurHittaren" },
      { property: "og:description", content: "Logga in eller skapa ett konto på DjurHittaren." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";
const emailS = z.string().trim().email("Ange en giltig e-postadress").max(255);
const pwS = z.string().min(8, "Minst 8 tecken").max(72);

function translate(msg: string) {
  if (/invalid login/i.test(msg)) return "Fel e-post eller lösenord.";
  if (/not confirmed/i.test(msg)) return "Bekräfta din e-postadress via länken vi skickade.";
  if (/already registered/i.test(msg)) return "Det finns redan ett konto med den e-postadressen.";
  if (/pwned|weak|compromised/i.test(msg)) return "Lösenordet är för svagt eller har läckt. Välj ett annat.";
  if (/rate limit/i.test(msg)) return "För många försök. Vänta en stund och försök igen.";
  return "Något gick fel. Försök igen.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "signup" | "forgot">(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/oversikt", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const em = emailS.safeParse(email);
    if (!em.success) errs.email = em.error.issues[0].message;
    if (mode !== "forgot") {
      const pw = pwS.safeParse(password);
      if (!pw.success) errs.password = pw.error.issues[0].message;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data!, password });
        if (error) throw error;
        navigate({ to: "/oversikt", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: em.data!,
          password,
          options: { emailRedirectTo: window.location.origin + "/oversikt" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/oversikt", replace: true });
        else setSent("signup");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data!, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("forgot");
      }
    } catch (err) {
      toast.error(translate((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = { login: "Välkommen tillbaka", signup: "Skapa konto", forgot: "Glömt lösenordet?" };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-10">
      <div className="surface w-full p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><MailCheck /></span>
            <h1 className="mt-4 text-2xl font-semibold">Kolla din e-post</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sent === "signup"
                ? `Vi har skickat en bekräftelselänk till ${email}. Klicka på den för att aktivera ditt konto.`
                : `Om det finns ett konto för ${email} har vi skickat en länk för att välja nytt lösenord.`}
            </p>
            <Button variant="ghost" className="mt-6" onClick={() => { setSent(null); setMode("login"); }}>Tillbaka till inloggning</Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Du får ett slumpat användarnamn – din e-post visas aldrig för andra." : mode === "forgot" ? "Vi skickar en länk för att välja ett nytt lösenord." : "Logga in för att hantera dina djur."}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <Field label="E-post" htmlFor="email" error={errors.email}>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {mode !== "forgot" && (
                <Field label="Lösenord" htmlFor="password" error={errors.password} hint={mode === "signup" ? "Minst 8 tecken" : undefined}>
                  <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka länk"}
              </Button>
            </form>
            <div className="mt-6 space-y-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>Glömt lösenordet?</button>
                  <p>Inget konto? <button className="font-semibold text-primary" onClick={() => setMode("signup")}>Skapa konto</button></p>
                </>
              )}
              {mode !== "login" && (
                <p>Har du redan ett konto? <button className="font-semibold text-primary" onClick={() => setMode("login")}>Logga in</button></p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
