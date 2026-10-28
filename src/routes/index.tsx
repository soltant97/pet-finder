import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DjurHittaren – hjälp borttappade djur hitta hem" },
      { name: "description", content: "Registrera ditt husdjur, anmäl det som borttappat och hjälp andra att återförenas med sina djur." },
      { property: "og:title", content: "DjurHittaren – hjälp borttappade djur hitta hem" },
      { property: "og:description", content: "Registrera ditt husdjur och se borttappade djur i ditt område." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <section className="grid items-center gap-8 pt-8 sm:pt-14 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">För alla som älskar djur</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Varje djur förtjänar att hitta hem.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Registrera ditt husdjur i förväg. Om det försvinner kan du på några sekunder anmäla det som borttappat – så att grannar och upphittare kan hjälpa till.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Skapa konto</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/borttappade">Se borttappade djur</Link></Button>
          </div>
        </div>
        <img src={hero} alt="En katt och en hund på en veranda" width={1280} height={960} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Heart, t: "Registrera i förväg", d: "Spara bilder och kännetecken medan allt är lugnt." },
          { icon: Search, t: "Anmäl direkt", d: "Markera ditt djur som borttappat så syns det i listan." },
          { icon: ShieldCheck, t: "Din integritet först", d: "Namn, kontaktuppgifter och chipnummer visas aldrig offentligt." },
        ].map(({ icon: I, t, d }) => (
          <div key={t} className="surface p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary"><I className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
