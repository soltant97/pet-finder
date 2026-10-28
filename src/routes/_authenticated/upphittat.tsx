import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Phone, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upphittat")({
  head: () => ({
    meta: [
      { title: "Upphittat djur – DjurHittaren" },
      { name: "description", content: "Har du hittat ett djur? Så här kan du hjälpa till." },
      { property: "og:title", content: "Upphittat djur – DjurHittaren" },
      { property: "og:description", content: "Har du hittat ett djur? Så här kan du hjälpa till." },
    ],
  }),
  component: FoundPage,
});

function FoundPage() {
  return (
    <PageShell title="Har du hittat ett djur?" subtitle="Tack för att du bryr dig! Möjligheten att anmäla upphittade djur och kontakta ägare direkt i appen kommer i en senare version.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-6">
          <Megaphone className="h-6 w-6 text-alert" />
          <h2 className="mt-3 text-lg font-semibold">Jämför med listan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Titta bland borttappade djur om du känner igen det.</p>
          <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/borttappade">Se borttappade djur</Link></Button>
        </div>
        <div className="surface p-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Kontrollera chip</h2>
          <p className="mt-1 text-sm text-muted-foreground">En veterinär kan läsa av ett eventuellt chip kostnadsfritt.</p>
        </div>
        <div className="surface p-6">
          <Phone className="h-6 w-6 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Kontakta polisen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upphittade hundar och katter kan anmälas till polisen på 114 14.</p>
        </div>
      </div>
    </PageShell>
  );
}
