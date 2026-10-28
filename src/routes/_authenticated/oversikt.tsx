import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Eye, Megaphone, PawPrint, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/oversikt")({
  head: () => ({
    meta: [
      { title: "Översikt – DjurHittaren" },
      { name: "description", content: "Din översikt på DjurHittaren." },
      { property: "og:title", content: "Översikt – DjurHittaren" },
      { property: "og:description", content: "Din översikt på DjurHittaren." },
    ],
  }),
  component: Dashboard,
});

const actions = [
  { to: "/registrera", title: "Registrera ditt djur", desc: "Lägg till bilder och kännetecken", icon: PlusCircle, tone: "primary" },
  { to: "/mina-djur", title: "Dina djur", desc: "Visa, redigera och ändra status", icon: PawPrint, tone: "primary" },
  { to: "/upphittat", title: "Upphittat djur", desc: "Har du hittat ett djur?", icon: Eye, tone: "primary" },
  { to: "/borttappade", title: "Borttappade djur", desc: "Djur som saknas just nu", icon: Megaphone, tone: "alert" },
] as const;

function Dashboard() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("username").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      <p className="text-sm text-muted-foreground">Hej{profile.data ? "," : ""}</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">{profile.data?.username ?? "\u00a0"}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {actions.map(({ to, title, desc, icon: I, tone }) => (
          <Link key={to} to={to} className="surface group flex items-center gap-4 p-5 transition-shadow hover:shadow-lift sm:p-6">
            <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", tone === "alert" ? "bg-alert-soft text-alert" : "bg-primary-soft text-primary")}>
              <I className="h-7 w-7" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl font-semibold">{title}</span>
              <span className="block text-sm text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </main>
  );
}
