import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { lostSchema, todayISO, type LostInput } from "@/lib/pets";
import { z } from "zod";

export function LostForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<LostInput>;
  submitLabel: string;
  onSubmit: (v: z.output<typeof lostSchema>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<LostInput>({
    last_location: initial?.last_location ?? "",
    last_seen_date: initial?.last_seen_date ?? todayISO(),
    circumstances: initial?.circumstances ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = lostSchema.safeParse(v);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(r.data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Senast kända plats *" htmlFor="loc" error={errors.last_location} hint="Ange ett område eller en gata – inte din hemadress.">
        <Input id="loc" value={v.last_location} onChange={(e) => setV({ ...v, last_location: e.target.value })} maxLength={160} placeholder="T.ex. Södermalm, nära Nytorget" />
      </Field>
      <Field label="Senast sedd *" htmlFor="date" error={errors.last_seen_date}>
        <Input id="date" type="date" max={todayISO()} value={v.last_seen_date} onChange={(e) => setV({ ...v, last_seen_date: e.target.value })} />
      </Field>
      <Field label="Omständigheter *" htmlFor="circ" error={errors.circumstances}>
        <Textarea id="circ" rows={4} value={v.circumstances} onChange={(e) => setV({ ...v, circumstances: e.target.value })} maxLength={1500} placeholder="Vad hände? Är djuret skyggt? Bär det halsband?" />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="alert" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} {submitLabel}
        </Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Avbryt</Button>}
      </div>
    </form>
  );
}
