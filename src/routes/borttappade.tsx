import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, PawPrint, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, sexLabel, signedUrls, speciesLabel, type Species } from "@/lib/pets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/borttappade")({
  head: () => ({
    meta: [
      { title: "Borttappade djur – DjurHittaren" },
      { name: "description", content: "Se katter, hundar och andra husdjur som just nu saknas. Har du sett något av dem?" },
      { property: "og:title", content: "Borttappade djur – DjurHittaren" },
      { property: "og:description", content: "Husdjur som just nu saknas. Har du sett något av dem?" },
    ],
  }),
  component: LostPage,
});

async function fetchLost() {
  const { data, error } = await supabase.rpc("get_lost_pets");
  if (error) throw error;
  const covers = data.map((p) => p.photo_paths[0]).filter((x): x is string => !!x);
  const urls = await signedUrls(covers);
  return data.map((p) => ({ ...p, cover: p.photo_paths[0] ? urls[p.photo_paths[0]] : undefined }));
}

function LostPage() {
  const q = useQuery({ queryKey: ["lost-pets"], queryFn: fetchLost });
  const [filter, setFilter] = useState<Species | "alla">("alla");
  const [text, setText] = useState("");
  const list = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (q.data ?? []).filter(
      (p) =>
        (filter === "alla" || p.species === filter) &&
        (!t || [p.name, p.last_location, p.color, p.breed].some((x) => x?.toLowerCase().includes(t))),
    );
  }, [q.data, filter, text]);

  return (
    <PageShell title="Borttappade djur" subtitle="Djur som deras ägare letar efter just nu. Håll utkik i ditt område.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Sök på plats, namn eller färg" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(["alla", "katt", "hund", "annat"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "h-10 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
                filter === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              {s === "alla" ? "Alla" : speciesLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {q.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        {q.isError && <p className="text-destructive">Kunde inte hämta listan. Försök ladda om sidan.</p>}
        {q.isSuccess && list.length === 0 && (
          <div className="surface col-span-full p-10 text-center">
            <PawPrint className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">Inga borttappade djur just nu</p>
            <p className="text-sm text-muted-foreground">{q.data.length ? "Prova att ändra din sökning." : "Skönt – alla verkar vara hemma."}</p>
          </div>
        )}
        {list.map((p) => (
          <article key={p.id} className="surface overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              {p.cover ? <img src={p.cover} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <PawPrint className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />}
              <span className="absolute left-3 top-3 rounded-full bg-alert px-2.5 py-1 text-xs font-semibold text-alert-foreground">Borttappad</span>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[speciesLabel[p.species], p.breed, p.color, p.sex !== "okant" ? sexLabel[p.sex] : null, p.age].filter(Boolean).join(" · ")}
                </p>
              </div>
              {p.marks && <p className="text-sm"><span className="font-semibold">Kännetecken:</span> {p.marks}</p>}
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-alert" /> {p.last_location}</p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-alert" /> Senast sedd {formatDate(p.last_seen_date)}</p>
              </div>
              {p.circumstances && <p className="line-clamp-3 text-sm text-muted-foreground">{p.circumstances}</p>}
              <Button asChild variant="outline" className="w-full"><Link to="/djur/$id" params={{ id: p.id }}>Visa djur och kontakta ägaren</Link></Button>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
