import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { contactData, notificationLabel, timestamp, contactError } from "@/lib/contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notiser")({
  head: () => ({
    meta: [
      { title: "Notiser – DjurHittaren" },
      { name: "description", content: "Dina notiser." },
      { property: "og:title", content: "Notiser – DjurHittaren" },
      { property: "og:description", content: "Dina notiser." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { userId } = Route.useRouteContext(); const navigate = useNavigate(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ["contact", userId], queryFn: () => contactData(userId) });
  async function open(n: NonNullable<typeof q.data>["notifications"][number]) {
    const { error } = await supabase.rpc("mark_notification_read", { _notification_id: n.id });
    if (error) { toast.error(contactError(error)); return; }
    await qc.invalidateQueries({ queryKey: ["contact"] });
    if (n.conversation_id) navigate({ to: "/samtal/$id", params: { id: n.conversation_id } });
    else navigate({ to: "/meddelanden", search: { request: n.request_id ?? undefined } });
  }
  return <PageShell title="Notiser">
    {q.isLoading && <p>Hämtar notiser…</p>}
    {q.isError && <div><p className="text-destructive">Kunde inte hämta notiser.</p><Button onClick={() => q.refetch()}>Försök igen</Button></div>}
    {q.data && !q.data.notifications.length && <div className="py-10 text-center"><Bell className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-semibold">Inga notiser</p></div>}
    <div className="divide-y">{q.data?.notifications.map((n) => <Button key={n.id} variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none py-4 text-left" onClick={() => open(n)}><Bell className="shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block break-words font-semibold">{notificationLabel[n.kind]} · {n.pet_name}</span><span className="block text-xs text-muted-foreground">{timestamp(n.created_at)}</span></span>{!n.read_at && <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">Oläst</span>}</Button>)}</div>
  </PageShell>;
}
