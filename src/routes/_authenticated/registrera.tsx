import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppHeader";
import { PetFields, emptyPet, usePetForm } from "@/components/PetForm";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Field } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { requireUserId, uploadPhotos, BUCKET } from "@/lib/pets";

export const Route = createFileRoute("/_authenticated/registrera")({
  head: () => ({
    meta: [
      { title: "Registrera ditt djur – DjurHittaren" },
      { name: "description", content: "Registrera ditt husdjur med bilder och kännetecken." },
      { property: "og:title", content: "Registrera ditt djur – DjurHittaren" },
      { property: "og:description", content: "Registrera ditt husdjur med bilder och kännetecken." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const form = usePetForm(emptyPet);
  const [files, setFiles] = useState<File[]>([]);
  const [photoErr, setPhotoErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    const hasPhoto = files.length > 0;
    setPhotoErr(hasPhoto ? "" : "Lägg till minst en tydlig bild på djuret");
    if (!data || !hasPhoto) return;
    setBusy(true);
    let petId: string | null = null;
    try {
      const userId = await requireUserId();
      const { data: pet, error } = await supabase.from("pets").insert({ ...data, owner_id: userId }).select("id").single();
      if (error) throw new Error("Kunde inte spara djuret.");
      petId = pet.id;
      await uploadPhotos(userId, pet.id, files);
      await qc.invalidateQueries({ queryKey: ["my-pets"] });
      toast.success(`${data.name} är registrerad!`);
      navigate({ to: "/mina-djur/$id", params: { id: pet.id } });
    } catch (err) {
      // Roll back so a pet is never stored without a photo
      if (petId) {
        const { data: photos } = await supabase.from("pet_photos").select("storage_path").eq("pet_id", petId);
        if (photos?.length) await supabase.storage.from(BUCKET).remove(photos.map((p) => p.storage_path));
        await supabase.from("pets").delete().eq("id", petId);
      }
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Registrera ditt djur" subtitle="Fyll i så mycket du kan. Ju fler detaljer, desto lättare blir det att känna igen ditt djur.">
      <form onSubmit={submit} className="surface space-y-8 p-5 sm:p-8" noValidate>
        <Field label="Bilder *" error={photoErr} hint="Minst en tydlig bild krävs">
          <PhotoPicker files={files} onChange={(f) => { setFiles(f); if (f.length) setPhotoErr(""); }} />
        </Field>
        <PetFields form={form} />
        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {busy && <Loader2 className="animate-spin" />} {busy ? "Sparar…" : "Registrera djur"}
        </Button>
      </form>
    </PageShell>
  );
}
