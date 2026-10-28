import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PawPrint, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signedUrls, speciesLabel } from "@/lib/pets";

export const Route = createFileRoute("/_authenticated/mina-djur/")({
  head: () => ({
    meta: [
      { title: "Dina djur – DjurHittaren" },
      { name: "description", content: "Dina registrerade husdjur." },
      { property: "og:title", content: "Dina djur – DjurHittaren" },
      { property: "og:description", content: "Dina registrerade husdjur." },
    ],
  }),
  component: MyPets,
});

function MyPets() {
  const q = useQuery({
    queryKey: ["my-pets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species, breed, color, status, pet_photos(storage_path, position)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const covers = data.map((p) => [...p.pet_photos].sort((a, b) => a.position - b.position)[0]?.storage_path).filter(Boolean) as string[];
      const urls = await signedUrls(covers);
      return data.map((p) => {
        const c = [...p.pet_photos].sort((a, b) => a.position - b.position)[0]?.storage_path;
        return { ...p, cover: c ? urls[c] : undefined };
      });
    },
  });

  return (
    <PageShell title="Dina djur">
      <div className="mb-6">
        <Button asChild><Link to="/registrera"><Plus /> Registrera nytt djur</Link></Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {q.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        {q.isError && <p className="text-destructive">Kunde inte hämta dina djur.</p>}
        {q.isSuccess && q.data.length === 0 && (
          <div className="surface col-span-full p-10 text-center">
            <PawPrint className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">Du har inte registrerat något djur än</p>
            <p className="text-sm text-muted-foreground">Registrera ditt djur nu så är du förberedd om något händer.</p>
          </div>
        )}
        {q.data?.map((p) => (
          <Link key={p.id} to="/mina-djur/$id" params={{ id: p.id }} className="surface overflow-hidden transition-shadow hover:shadow-lift">
            <div className="aspect-[4/3] bg-muted">
              {p.cover && <img src={p.cover} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-sm text-muted-foreground">{[speciesLabel[p.species], p.breed, p.color].filter(Boolean).join(" · ")}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
