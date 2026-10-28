import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { PetFields, usePetForm } from "@/components/PetForm";
import { PhotoPicker } from "@/components/PhotoPicker";
import { LostForm } from "@/components/LostForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BUCKET, formatDate, requireUserId, sexLabel, signedUrls, speciesLabel, uploadPhotos, type PetStatus } from "@/lib/pets";

export const Route = createFileRoute("/_authenticated/mina-djur/$id")({
  head: () => ({
    meta: [
      { title: "Djurprofil – DjurHittaren" },
      { name: "description", content: "Visa och redigera ditt djurs profil." },
      { property: "og:title", content: "Djurprofil – DjurHittaren" },
      { property: "og:description", content: "Visa och redigera ditt djurs profil." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PetPage,
});

function usePet(id: string) {
  return useQuery({
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*, pet_photos(id, storage_path, position), lost_reports(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const photos = [...data.pet_photos].sort((a, b) => a.position - b.position);
      const urls = await signedUrls(photos.map((p) => p.storage_path));
      return { ...data, photos: photos.map((p) => ({ ...p, url: urls[p.storage_path] })), report: data.lost_reports };
    },
  });
}

function PetPage() {
  const { id } = Route.useParams();
  const q = usePet(id);
  const qc = useQueryClient();
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["pet", id] }), qc.invalidateQueries({ queryKey: ["my-pets"] }), qc.invalidateQueries({ queryKey: ["lost-pets"] })]);

  const back = (
    <Link to="/mina-djur" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Dina djur
    </Link>
  );

  if (q.isLoading) return <main className="mx-auto max-w-5xl px-4 pt-10">{back}<Skeleton className="h-96 rounded-2xl" /></main>;
  if (q.isError || !q.data)
    return (
      <main className="mx-auto max-w-5xl px-4 pt-10">
        {back}
        <div className="surface p-10 text-center">
          <p className="font-semibold">Djuret hittades inte</p>
          <p className="text-sm text-muted-foreground">Det kan ha tagits bort, eller så har du inte behörighet att se det.</p>
        </div>
      </main>
    );

  return <PetDetail pet={q.data} back={back} refresh={refresh} />;
}

type PetData = NonNullable<ReturnType<typeof usePet>["data"]>;

function PetDetail({ pet, back, refresh }: { pet: PetData; back: React.ReactNode; refresh: () => Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [lostMode, setLostMode] = useState<null | "new" | "edit">(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function setStatus(status: PetStatus) {
    setBusy(true);
    const { error } = await supabase.from("pets").update({ status }).eq("id", pet.id);
    if (!error && status !== "borttappad") await supabase.from("lost_reports").delete().eq("pet_id", pet.id);
    setBusy(false);
    if (error) return void toast.error("Kunde inte ändra status.");
    toast.success(status === "aterfunnen" ? `Vad härligt att ${pet.name} är hemma igen!` : "Status uppdaterad");
    await refresh();
  }

  async function saveLost(v: { last_location: string; last_seen_date: string; circumstances: string }) {
    const userId = await requireUserId();
    const { error } = await supabase.from("lost_reports").upsert({ pet_id: pet.id, owner_id: userId, ...v });
    if (error) return void toast.error(error.message.includes("framtiden") ? "Datumet kan inte vara i framtiden." : "Kunde inte spara uppgifterna.");
    if (pet.status !== "borttappad") {
      const { error: e2 } = await supabase.from("pets").update({ status: "borttappad" }).eq("id", pet.id);
      if (e2) return void toast.error("Kunde inte ändra status.");
      toast.success(`${pet.name} visas nu bland borttappade djur`);
    } else toast.success("Uppgifterna är uppdaterade");
    setLostMode(null);
    await refresh();
  }

  async function deletePet() {
    if (pet.photos.length) await supabase.storage.from(BUCKET).remove(pet.photos.map((p) => p.storage_path));
    const { error } = await supabase.from("pets").delete().eq("id", pet.id);
    if (error) return void toast.error("Kunde inte ta bort djuret.");
    await refresh();
    toast.success(`${pet.name} har tagits bort`);
    navigate({ to: "/mina-djur" });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      {back}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">{pet.name}</h1>
        <StatusBadge status={pet.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Photos pet={pet} refresh={refresh} />
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Uppgifter</h2>
              {!editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> Redigera</Button>}
            </div>
            {editing ? <EditPet pet={pet} onDone={async () => { setEditing(false); await refresh(); }} /> : (
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Row k="Djurslag" v={speciesLabel[pet.species]} />
                <Row k="Ras" v={pet.breed} />
                <Row k="Färg" v={pet.color} />
                <Row k="Kön" v={sexLabel[pet.sex]} />
                <Row k="Ålder" v={pet.age} />
                <Row k="Chipnummer" v={pet.microchip} />
                <Row k="Kännetecken" v={pet.marks} wide />
                <Row k="Beskrivning" v={pet.description} wide />
              </dl>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className={pet.status === "borttappad" ? "surface border-alert/40 p-5 sm:p-6" : "surface p-5 sm:p-6"}>
            <h2 className="text-xl font-semibold">Status</h2>
            {lostMode ? (
              <div className="mt-4">
                <LostForm
                  initial={lostMode === "edit" && pet.report ? pet.report : undefined}
                  submitLabel={lostMode === "new" ? "Markera som borttappad" : "Spara uppgifter"}
                  onSubmit={saveLost}
                  onCancel={() => setLostMode(null)}
                />
              </div>
            ) : pet.status === "borttappad" && pet.report ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{pet.name} visas just nu bland borttappade djur.</p>
                <div className="space-y-2 rounded-xl bg-alert-soft p-4 text-sm">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-alert" /> {pet.report.last_location}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-alert" /> {formatDate(pet.report.last_seen_date)}</p>
                  <p className="text-foreground/80">{pet.report.circumstances}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setStatus("aterfunnen")} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Markera som återfunnen</Button>
                  <Button variant="outline" onClick={() => setLostMode("edit")}>Redigera uppgifter</Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {pet.status === "aterfunnen" ? `${pet.name} är markerad som återfunnen.` : `${pet.name} är registrerad. Om djuret försvinner kan du anmäla det här.`}
                </p>
                <Button variant="alert" className="w-full" onClick={() => setLostMode("new")}>Markera som borttappad</Button>
                {pet.status === "aterfunnen" && (
                  <Button variant="outline" className="w-full" onClick={() => setStatus("registrerad")} disabled={busy}>Ändra till Registrerad</Button>
                )}
              </div>
            )}
          </section>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive"><Trash2 /> Ta bort djur</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort {pet.name}?</AlertDialogTitle>
                <AlertDialogDescription>Djurprofilen och alla bilder tas bort permanent.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={deletePet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ta bort</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </aside>
      </div>
    </main>
  );
}

function Row({ k, v, wide }: { k: string; v: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v || "–"}</dd>
    </div>
  );
}

function EditPet({ pet, onDone }: { pet: PetData; onDone: () => Promise<void> }) {
  const form = usePetForm({
    name: pet.name, species: pet.species, breed: pet.breed ?? "", color: pet.color, sex: pet.sex,
    age: pet.age ?? "", microchip: pet.microchip ?? "", marks: pet.marks ?? "", description: pet.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setBusy(true);
    const { error } = await supabase.from("pets").update(data).eq("id", pet.id);
    setBusy(false);
    if (error) return void toast.error("Kunde inte spara ändringarna.");
    toast.success("Ändringarna är sparade");
    await onDone();
  }
  return (
    <form onSubmit={save} className="mt-4 space-y-6" noValidate>
      <PetFields form={form} />
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Spara</Button>
        <Button type="button" variant="ghost" onClick={() => onDone()}>Avbryt</Button>
      </div>
    </form>
  );
}

function Photos({ pet, refresh }: { pet: PetData; refresh: () => Promise<unknown> }) {
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const current = pet.photos[Math.min(active, pet.photos.length - 1)];

  async function upload() {
    setBusy(true);
    try {
      const userId = await requireUserId();
      const start = Math.max(-1, ...pet.photos.map((p) => p.position)) + 1;
      await uploadPhotos(userId, pet.id, adding, start);
      setAdding([]);
      toast.success("Bilderna är uppladdade");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: PetData["photos"][number]) {
    if (pet.photos.length <= 1) return void toast.error("Ditt djur måste ha minst en bild.");
    const { error } = await supabase.from("pet_photos").delete().eq("id", photo.id);
    if (error) return void toast.error("Kunde inte ta bort bilden.");
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    setActive(0);
    await refresh();
  }

  return (
    <section className="surface overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        {current?.url && <img src={current.url} alt={pet.name} className="h-full w-full object-cover" />}
        {current && pet.photos.length > 1 && (
          <button onClick={() => remove(current)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow" aria-label="Ta bort bild">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-4 p-4">
        {pet.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {pet.photos.map((p, i) => (
              <button key={p.id} onClick={() => setActive(i)} className={i === active ? "h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 ring-primary" : "h-16 w-16 shrink-0 overflow-hidden rounded-lg opacity-70"}>
                {p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
        )}
        <PhotoPicker files={adding} onChange={setAdding} existingCount={pet.photos.length} />
        {adding.length > 0 && <Button onClick={upload} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Ladda upp {adding.length} bild{adding.length > 1 ? "er" : ""}</Button>}
      </div>
    </section>
  );
}
