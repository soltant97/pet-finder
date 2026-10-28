import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Info, Loader2, LocateFixed, MapPin, PawPrint, RotateCcw, Search, Expand, Pencil } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { formatDate, sexLabel, signedUrls, speciesLabel, todayISO, type Species } from "@/lib/pets";
import {
  levelLabel, nextLevel, reverseGeocode, saveFoundReport, searchLost, startLevel,
  type FoundQuery, type Match, type SearchLevel,
} from "@/lib/found";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upphittat")({
  head: () => ({
    meta: [
      { title: "Upphittat djur – DjurHittaren" },
      { name: "description", content: "Har du hittat ett djur? Sök bland anmälda borttappade djur i ditt område." },
      { property: "og:title", content: "Upphittat djur – DjurHittaren" },
      { property: "og:description", content: "Sök bland anmälda borttappade djur där du hittade djuret." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FoundPage,
});

type Step = "form" | "results";

function FoundPage() {
  const { session } = useSession();
  const [step, setStep] = useState<Step>("form");
  const [files, setFiles] = useState<File[]>([]);
  const [q, setQ] = useState<FoundQuery>({ species: null, area: "", city: "", foundDate: null, description: "" });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locErr, setLocErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [level, setLevel] = useState<SearchLevel>("hela");
  const [results, setResults] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Match | null>(null);

  function useDeviceLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Din enhet stöder inte platsdelning. Skriv in platsen istället.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setQ((v) => ({ ...v, area: r.area, city: r.city }));
          setLocErr(null);
          toast.success("Platsen är ifylld. Kontrollera att den stämmer.");
        } catch {
          toast.error("Kunde inte slå upp platsen. Skriv in den istället.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Du nekade platsåtkomst. Skriv in platsen istället." : "Kunde inte hämta din plats. Skriv in den istället.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function run(query: FoundQuery, l: SearchLevel) {
    setBusy(true);
    setError(null);
    try {
      setResults(await searchLost(query, l));
      setLevel(l);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel. Försök igen.");
      setStep("results");
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.area.trim().length < 2 && q.city.trim().length < 2) {
      setLocErr("Ange ungefär var du hittade djuret – ett område eller en ort.");
      return;
    }
    if (date && date > todayISO()) {
      toast.error("Datumet kan inte vara i framtiden.");
      return;
    }
    setLocErr(null);
    const query = { ...q, foundDate: date || null };
    setQ(query);
    await run(query, startLevel(query));
    if (session) {
      const foundAt = date ? new Date(`${date}T${time || "12:00"}:00`).toISOString() : null;
      saveFoundReport(session.user.id, query, files, foundAt).catch((err: Error) => toast.error(err.message));
    }
  }

  const expand = nextLevel(q, level);

  return (
    <PageShell
      title="Har du hittat ett djur?"
      subtitle="Fyll i vad du vet så söker vi bland djur som just nu är anmälda som borttappade."
    >
      {step === "form" && (
        <form onSubmit={submit} className="surface space-y-6 p-5 sm:p-8">
          <Field label="Bilder på djuret" htmlFor="photos" hint="Bilderna visas bredvid träffarna så du kan jämföra själv.">
            <PhotoPicker files={files} onChange={setFiles} camera />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">Djurslag</p>
            <div className="flex flex-wrap gap-2">
              {([null, "katt", "hund", "annat"] as const).map((s) => (
                <button
                  key={s ?? "vet-ej"}
                  type="button"
                  onClick={() => setQ({ ...q, species: s })}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                    q.species === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                  )}
                >
                  {s ? speciesLabel[s as Species] : "Vet inte"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Var hittade du djuret? *</p>
              <Button type="button" variant="outline" size="sm" onClick={useDeviceLocation} disabled={locating}>
                {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Använd min plats
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Område / stadsdel" htmlFor="area">
                <Input id="area" value={q.area} maxLength={80} onChange={(e) => setQ({ ...q, area: e.target.value })} placeholder="T.ex. Södermalm" />
              </Field>
              <Field label="Ort / kommun" htmlFor="city" error={locErr ?? undefined}>
                <Input id="city" value={q.city} maxLength={80} onChange={(e) => setQ({ ...q, city: e.target.value })} placeholder="T.ex. Stockholm" />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Din exakta position sparas aldrig – den används bara för att fylla i områdets namn.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Datum (om du vet)" htmlFor="date">
              <Input id="date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Tid (om du vet)" htmlFor="time">
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>

          <Field label="Beskrivning (valfritt)" htmlFor="desc" hint="Färg, ras, halsband, kännetecken och hur du hittade djuret.">
            <Textarea id="desc" rows={4} maxLength={1500} value={q.description} onChange={(e) => setQ({ ...q, description: e.target.value })} placeholder="T.ex. grå randig katt med vit tass, satt vid busshållplatsen" />
          </Field>

          {!session && (
            <p className="flex gap-2 rounded-xl bg-accent p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Du kan söka utan konto. Bilderna stannar då bara i din webbläsare. <Link to="/auth" className="font-semibold underline">Logga in</Link> om du vill spara din anmälan.
              </span>
            </p>
          )}

          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Search />} Sök bland borttappade djur
          </Button>
        </form>
      )}

      {step === "results" && (
        <div className="space-y-6">
          <div className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            {files.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {files.map((f, i) => (
                  <FilePreview key={i} file={f} />
                ))}
              </div>
            )}
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                Sökområde: {levelLabel[level]}
                {level !== "hela" && <> – ”{level === "omrade" ? q.area : q.city}”</>}
              </p>
              <p className="text-muted-foreground">
                Vi jämför djurslag, plats (som text) och datum med anmälningarna, och sorterar efter liknande färg, ras och kännetecken. Bilderna jämförs inte automatiskt – titta själv.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("form")}><Pencil /> Ändra sökning</Button>
              {expand && <Button size="sm" onClick={() => run(q, expand)} disabled={busy}><Expand /> Utöka till {levelLabel[expand].toLowerCase()}</Button>}
            </div>
          </div>

          {busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Söker…</p>}

          {error && (
            <div className="surface p-8 text-center">
              <p className="font-semibold text-destructive">{error}</p>
              <Button className="mt-4" onClick={() => run(q, level)}><RotateCcw /> Försök igen</Button>
            </div>
          )}

          {!error && results && results.length === 0 && (
            <div className="surface p-8 text-center">
              <PawPrint className="mx-auto h-8 w-8 text-primary" />
              <p className="mx-auto mt-3 max-w-lg font-semibold">
                Inga borttappade djur matchades med dina uppgifter. Det betyder inte att djuret saknar ägare. Du kan prova att utöka sökområdet eller ändra sökningen.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {expand && <Button onClick={() => run(q, expand)}><Expand /> Utöka till {levelLabel[expand].toLowerCase()}</Button>}
                <Button variant="outline" onClick={() => setStep("form")}><MapPin /> Ändra plats</Button>
                <Button variant="outline" onClick={() => setStep("form")}><Pencil /> Granska bilderna</Button>
                <Button variant="ghost" onClick={() => run(q, level)}><RotateCcw /> Sök igen</Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">Tips: en veterinär kan läsa av ett eventuellt chip, och upphittade djur kan anmälas till polisen på 114 14.</p>
            </div>
          )}

          {!error && results && results.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">{results.length} borttappade djur i sökområdet</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <button key={p.id} onClick={() => setOpen(p)} className="surface overflow-hidden text-left transition-shadow hover:shadow-lg">
                    <div className="relative aspect-[4/3] bg-muted">
                      {p.cover ? <img src={p.cover} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <PawPrint className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />}
                      <span className="absolute left-3 top-3 rounded-full bg-alert px-2.5 py-1 text-xs font-semibold text-alert-foreground">Borttappad</span>
                    </div>
                    <div className="space-y-2 p-5">
                      <h2 className="text-xl font-semibold">{p.name}</h2>
                      <p className="text-sm text-muted-foreground">{[speciesLabel[p.species], p.breed, p.color].filter(Boolean).join(" · ")}</p>
                      {p.marks && <p className="line-clamp-2 text-sm"><span className="font-semibold">Kännetecken:</span> {p.marks}</p>}
                      <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-alert" /> {p.last_location}</p>
                      <p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-alert" /> Senast sedd {formatDate(p.last_seen_date)}</p>
                      {p.matched.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.matched.map((m) => <span key={m} className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">Liknande {m.toLowerCase()}</span>)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <PetDialog pet={open} onClose={() => setOpen(null)} />
    </PageShell>
  );
}

function FilePreview({ file }: { file: File }) {
  const [src] = useState(() => URL.createObjectURL(file));
  return <img src={src} alt="Din bild" className="h-20 w-20 shrink-0 rounded-lg object-cover" />;
}

function PetDialog({ pet, onClose }: { pet: Match | null; onClose: () => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    setUrls([]);
    if (!pet) return;
    let live = true;
    signedUrls(pet.photo_paths)
      .then((m) => live && setUrls(pet.photo_paths.map((p) => m[p]).filter((x): x is string => !!x)))
      .catch(() => undefined);
    return () => { live = false; };
  }, [pet]);
  return (
    <Dialog open={!!pet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {pet && (
          <>
            <DialogHeader><DialogTitle className="text-2xl">{pet.name}</DialogTitle></DialogHeader>
            {urls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {urls.map((u) => <img key={u} src={u} alt={pet.name} className="aspect-square w-full rounded-lg object-cover" />)}
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-lg bg-muted"><PawPrint className="h-10 w-10 text-muted-foreground" /></div>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-semibold">Djurslag</dt><dd>{speciesLabel[pet.species]}</dd>
              {pet.breed && <><dt className="font-semibold">Ras</dt><dd>{pet.breed}</dd></>}
              <dt className="font-semibold">Färg</dt><dd>{pet.color}</dd>
              {pet.sex !== "okant" && <><dt className="font-semibold">Kön</dt><dd>{sexLabel[pet.sex]}</dd></>}
              {pet.age && <><dt className="font-semibold">Ålder</dt><dd>{pet.age}</dd></>}
              {pet.marks && <><dt className="font-semibold">Kännetecken</dt><dd>{pet.marks}</dd></>}
              <dt className="font-semibold">Senast sedd</dt><dd>{pet.last_location}, {formatDate(pet.last_seen_date)}</dd>
            </dl>
            {pet.circumstances && <p className="text-sm text-muted-foreground">{pet.circumstances}</p>}
            <Button asChild><Link to="/djur/$id" params={{ id: pet.id }}>Kontakta ägaren</Link></Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
