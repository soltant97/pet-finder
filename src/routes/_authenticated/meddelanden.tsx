import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MessageCircle, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { contactData, contactError, requestStatusLabel, timestamp, uuidSchema } from "@/lib/contact";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/meddelanden")({
  validateSearch: (search: Record<string, unknown>): { request?: string } => ({ request: uuidSchema.safeParse(search["request"]).success ? String(search["request"]) : undefined }),
  head: () => ({ meta: [
    { title: "Meddelanden och förfrågningar – DjurHittaren" }, { name: "description", content: "Dina privata samtal och kontaktförfrågningar om upphittade djur." },
    { property: "og:title", content: "Meddelanden – DjurHittaren" }, { property: "og:description", content: "Säkra privata samtal om djur som saknas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Inbox,
});
function Inbox() {
  const { userId } = Route.useRouteContext();
  const { request: selected } = Route.useSearch();
  const qc = useQueryClient(); const navigate = useNavigate();
  const [busy, setBusy] = useState<string>();
  const q = useQuery({ queryKey: ["contact", userId], queryFn: () => contactData(userId) });
  async function respond(id: string, status: "accepted" | "declined" | "cancelled") {
    setBusy(id);
    const { data, error } = await supabase.rpc("respond_contact_request", { _request_id: id, _status: status });
    setBusy(undefined);
    if (error) { toast.error(contactError(error)); return; }
    await qc.invalidateQueries({ queryKey: ["contact"] });
    if (data) navigate({ to: "/samtal/$id", params: { id: data } });
    else toast.success(status === "declined" ? "Förfrågan har avböjts." : "Förfrågan har återkallats.");
  }
  async function block(id: string, blocked: boolean) {
    setBusy(id);
    const { error } = await supabase.rpc("set_contact_block", { _request_id: id, _blocked: blocked });
    setBusy(undefined);
    if (error) toast.error(contactError(error));
    else { await qc.invalidateQueries({ queryKey: ["contact"] }); toast.success(blocked ? "Kontakten är blockerad. Nya meddelanden och förfrågningar stoppas." : "Blockeringen har tagits bort."); }
  }
  return <PageShell title="Meddelanden">
    {q.isLoading && <p className="flex gap-2"><Loader2 className="animate-spin" /> Hämtar meddelanden…</p>}
    {q.isError && <div><p className="text-destructive">Kunde inte hämta dina samtal.</p><Button className="mt-3" onClick={() => q.refetch()}>Försök igen</Button></div>}
    {q.data && <div className="space-y-10">
      <section><h2 className="mb-4 text-2xl font-semibold">Privata samtal</h2>
        {!q.data.conversations.length && <p className="text-sm text-muted-foreground">Inga samtal ännu. Ett samtal öppnas när en kontaktförfrågan accepteras.</p>}
        <div className="divide-y">{q.data.conversations.map((c) => {
          const unread = q.data.notifications.filter((n) => n.conversation_id === c.id && !n.read_at).length;
          return <Link key={c.id} to="/samtal/$id" params={{ id: c.id }} className="flex items-center gap-3 py-4"><MessageCircle className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block break-words font-semibold">{c.pet_name}</span><span className="text-sm text-muted-foreground">{userId === c.owner_id ? "Med upphittaren" : "Med ägaren"}</span></span>{unread > 0 && <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">{unread} olästa</span>}</Link>;
        })}</div>
      </section>
      <section><h2 className="mb-4 text-2xl font-semibold">Kontaktförfrågningar</h2>
        {!q.data.requests.length && <p className="text-sm text-muted-foreground">Du har inga kontaktförfrågningar.</p>}
        {selected && !q.data.requests.some((r) => r.id === selected) && <p className="text-destructive">Förfrågan är inte tillgänglig.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{[...q.data.requests].sort((a, b) => Number(b.id === selected) - Number(a.id === selected)).map((r) => {
          const owner = r.owner_id === userId;
          const blocked = q.data.blocks.some((b) => b.blocked_id === (owner ? r.finder_id : r.owner_id));
          const c = q.data.conversations.find((c) => c.request_id === r.id);
          return <article key={r.id} className={`surface min-w-0 space-y-3 p-5 ${r.id === selected ? "ring-2 ring-primary" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-semibold">{r.pet_name}</h3><span className="text-xs font-semibold text-muted-foreground">{requestStatusLabel[r.status]}</span></div>
            <p className="text-xs text-muted-foreground">{owner ? "Från upphittaren" : "Till ägaren"} · {timestamp(r.created_at)}</p>
            <p className="whitespace-pre-wrap break-words text-sm">{r.introduction}</p>
            <div className="flex flex-wrap gap-2">
              {r.status === "pending" && (owner ? <><Button disabled={busy === r.id || blocked} onClick={() => respond(r.id, "accepted")}>Acceptera</Button><Button variant="outline" disabled={busy === r.id} onClick={() => respond(r.id, "declined")}>Avböj</Button></> : <Button variant="outline" disabled={busy === r.id} onClick={() => respond(r.id, "cancelled")}>Återkalla</Button>)}
              {c && <Button asChild><Link to="/samtal/$id" params={{ id: c.id }}>Öppna samtal</Link></Button>}
              <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => block(r.id, !blocked)}><ShieldBan />{blocked ? "Ta bort blockering" : "Blockera kontakt"}</Button>
            </div>
          </article>;
        })}</div>
      </section>
    </div>}
  </PageShell>;
}