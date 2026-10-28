import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageShell } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/notiser")({
  head: () => ({
    meta: [
      { title: "Notiser – DjurHittaren" },
      { name: "description", content: "Dina notiser." },
      { property: "og:title", content: "Notiser – DjurHittaren" },
      { property: "og:description", content: "Dina notiser." },
    ],
  }),
  component: () => (
    <PageShell title="Notiser">
      <div className="surface p-10 text-center">
        <Bell className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-semibold">Inga notiser</p>
        <p className="text-sm text-muted-foreground">Notiser om exempelvis möjliga matchningar kommer i en senare version.</p>
      </div>
    </PageShell>
  ),
});
