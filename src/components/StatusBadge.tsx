import { cn } from "@/lib/utils";
import { statusLabel, type PetStatus } from "@/lib/pets";

const styles: Record<PetStatus, string> = {
  registrerad: "bg-primary-soft text-accent-foreground",
  borttappad: "bg-alert-soft text-alert",
  aterfunnen: "bg-success-soft text-success",
};

export function StatusBadge({ status, className }: { status: PetStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", styles[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}
