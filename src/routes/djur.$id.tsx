import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PawPrint, ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { ContactOwner } from "@/components/ContactOwner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { signedUrls, speciesLabel, sexLabel, formatDate } from "@/lib/pets";

export const Route = createFileRoute("/djur/$id")({
  head: () => ({ meta: [
    { title: "Borttappat djur – kontakta ägaren | DjurHittaren" },
    { name: "description", content: "Se djurets kännetecken och kontakta ägaren säkert via DjurHittaren." },
    { property: "og:title", content: "Borttappat djur – DjurHittaren" },
    { property: "og:description", content: "Hjälp ett borttappat djur hitta hem. Kontakta ägaren utan att dela privata kontaktuppgifter." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PetProfile,
});
function PetProfile() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["lost-pet", id], queryFn: async () => {
    const { data, error } = await supabase.rpc("get_lost_pets");
    if (error) throw error;
    const pet = data.find((p) => p.id === id);
    if (!pet) return null;
    const urls = await signedUrls(pet.photo_paths);
    return { ...pet, urls: pet.photo_paths.map((path) => urls[path]).filter((url): url is string => !!url) };
  } });
  const pet = q.data;
  return <PageShell title={pet?.name ?? "Djurprofil"} back={<Button asChild variant="ghost" className="mb-4"><Link to="/borttappade"><ArrowLeft /> Borttappade djur</Link></Button>}>
    {q.isLoading && <p className="flex gap-2"><Loader2 className="animate-spin" /> Hämtar djuret…</p>}
    {q.isError && <div><p className="text-destructive">Kunde inte hämta djuret.</p><Button className="mt-3" onClick={() => q.refetch()}>Försök igen</Button></div>}
    {q.isSuccess && !pet && <p>Djuret är inte längre anmält som borttappat, eller profilen är inte tillgänglig.</p>}
    {pet && <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">{pet.urls.length ? pet.urls.map((url) => <img key={url} src={url} alt={pet.name} className="aspect-[4/3] w-full rounded-lg object-cover" />) : <div className="grid aspect-[4/3] place-items-center bg-muted"><PawPrint className="h-12 w-12 text-muted-foreground" /></div>}</div>
      <div className="min-w-0 space-y-5"><span className="inline-block rounded-full bg-alert-soft px-3 py-1 text-sm font-semibold text-alert">Borttappad</span><dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm [&_dd]:break-words [&_dt]:font-semibold">
        <dt>Djurslag</dt><dd>{speciesLabel[pet.species]}</dd>
        {pet.breed && <><dt>Ras</dt><dd>{pet.breed}</dd></>}<dt>Färg</dt><dd>{pet.color}</dd>
        <dt>Kön</dt><dd>{sexLabel[pet.sex]}</dd>{pet.age && <><dt>Ålder</dt><dd>{pet.age}</dd></>}
        {pet.marks && <><dt>Kännetecken</dt><dd>{pet.marks}</dd></>}
        <dt>Senast sedd</dt><dd>{pet.last_location}<br />{formatDate(pet.last_seen_date)}</dd>
      </dl>{pet.circumstances && <p className="break-words text-sm text-muted-foreground">{pet.circumstances}</p>}<ContactOwner petId={pet.id} /></div>
    </div>}
  </PageShell>;
}