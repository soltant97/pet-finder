import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_PHOTOS, validateFile } from "@/lib/pets";

export function PhotoPicker({
  files,
  onChange,
  existingCount = 0,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  existingCount?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const remaining = MAX_PHOTOS - existingCount - files.length;

  function add(list: FileList | null) {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateFile(f);
      if (err) toast.error(err);
      else ok.push(f);
    }
    if (ok.length > remaining) toast.error(`Du kan ha högst ${MAX_PHOTOS} bilder.`);
    onChange([...files, ...ok.slice(0, Math.max(0, remaining))]);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-card/90 text-foreground shadow"
              aria-label="Ta bort bild"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="h-6 w-6" />
            Lägg till
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">JPG, PNG eller WebP, högst 5 MB per bild. Max {MAX_PHOTOS} bilder.</p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />
    </div>
  );
}
