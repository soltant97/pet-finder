import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { petSchema, type PetInput, type Species, type Sex, speciesLabel, sexLabel } from "@/lib/pets";
import { z } from "zod";

export type PetValues = z.output<typeof petSchema>;

export const emptyPet: PetInput = {
  name: "", species: "katt", breed: "", color: "", sex: "okant", age: "", microchip: "", marks: "", description: "",
};

export const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function usePetForm(initial: PetInput) {
  const [values, setValues] = useState<PetInput>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof PetInput, string>>>({});
  const set = (k: keyof PetInput) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  function validate(): PetValues | null {
    const r = petSchema.safeParse(values);
    if (!r.success) {
      const errs: Partial<Record<keyof PetInput, string>> = {};
      r.error.issues.forEach((i) => (errs[i.path[0] as keyof PetInput] = i.message));
      setErrors(errs);
      return null;
    }
    setErrors({});
    return r.data;
  }
  return { values, errors, set, validate };
}

export function PetFields({ form, extra }: { form: ReturnType<typeof usePetForm>; extra?: ReactNode }) {
  const { values: v, errors: e, set } = form;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Namn *" htmlFor="name" error={e.name}>
        <Input id="name" value={v.name} onChange={set("name")} maxLength={60} />
      </Field>
      <Field label="Djurslag *" htmlFor="species">
        <select id="species" className={selectClass} value={v.species} onChange={set("species")}>
          {(Object.keys(speciesLabel) as Species[]).map((s) => <option key={s} value={s}>{speciesLabel[s]}</option>)}
        </select>
      </Field>
      <Field label="Ras" htmlFor="breed" error={e.breed} hint="Om du vet">
        <Input id="breed" value={v.breed ?? ""} onChange={set("breed")} maxLength={80} />
      </Field>
      <Field label="Färg *" htmlFor="color" error={e.color}>
        <Input id="color" value={v.color} onChange={set("color")} maxLength={80} placeholder="T.ex. grå tigrerad" />
      </Field>
      <Field label="Kön" htmlFor="sex">
        <select id="sex" className={selectClass} value={v.sex} onChange={set("sex")}>
          {(Object.keys(sexLabel) as Sex[]).map((s) => <option key={s} value={s}>{sexLabel[s]}</option>)}
        </select>
      </Field>
      <Field label="Ålder" htmlFor="age" error={e.age} hint="Ungefärlig ålder går bra">
        <Input id="age" value={v.age ?? ""} onChange={set("age")} maxLength={40} placeholder="T.ex. ca 3 år" />
      </Field>
      <Field label="Chipnummer" htmlFor="microchip" error={e.microchip} hint="Visas aldrig offentligt">
        <Input id="microchip" value={v.microchip ?? ""} onChange={set("microchip")} inputMode="numeric" maxLength={24} />
      </Field>
      <Field label="Kännetecken" htmlFor="marks" error={e.marks}>
        <Input id="marks" value={v.marks ?? ""} onChange={set("marks")} maxLength={500} placeholder="T.ex. vit fläck på bröstet" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Övrig beskrivning" htmlFor="description" error={e.description}>
          <Textarea id="description" rows={4} value={v.description ?? ""} onChange={set("description")} maxLength={1500} />
        </Field>
      </div>
      {extra && <div className="sm:col-span-2">{extra}</div>}
    </div>
  );
}
