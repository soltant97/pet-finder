import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { supabase } from "@/integrations/supabase/client";
import { contactError, messageSchema, timestamp } from "@/lib/contact";

export const Route = createFileRoute("/_authenticated/samtal/$id")({
  head: () => ({ meta: [ { title: "Privat samtal – DjurHittaren" }, { name: "description", content: "Ett privat samtal mellan djurets ägare och upphittare." }, { property: "og:title", content: "Privat samtal – DjurHittaren" }, { property: "og:description", content: "Dina privata meddelanden på DjurHittaren." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }), component: Conversation,
});
function Conversation() {
  const { id } = Route.useParams(); const { userId } = Route.useRouteContext();
  const qc = useQueryClient(); const bottom = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const q = useQuery({ queryKey: ["messages", id, userId], queryFn: async () => {
    const { data: conversation, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!conversation) return null;
    const [messages, blocks] = await Promise.all([supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").order("id"), supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId).eq("blocked_id", userId === conversation.owner_id ? conversation.finder_id : conversation.owner_id)]);
    if (messages.error) throw messages.error;
    if (blocks.error) throw blocks.error;
    return { conversation, messages: messages.data ?? [], blocked: !!blocks.data?.length };
  } });
  useEffect(() => {
    if (!q.data) return;
    let active = true;
    async function markRead() { if (document.visibilityState !== "visible") return; const { error } = await supabase.rpc("mark_conversation_read", { _conversation_id: id }); if (!error && active) void qc.invalidateQueries({ queryKey: ["contact"] }); }
    void markRead(); document.addEventListener("visibilitychange", markRead);
    bottom.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    return () => { active = false; document.removeEventListener("visibilitychange", markRead); };
  }, [q.data?.messages.length, id, qc]);
  async function send(e: React.FormEvent) {
    e.preventDefault(); const parsed = messageSchema.safeParse(body);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    setBusy(true); setError(undefined);
    const { error } = await supabase.rpc("send_private_message", { _conversation_id: id, _body: parsed.data });
    setBusy(false);
    if (error) { setError(contactError(error)); return; }
    setBody(""); await qc.invalidateQueries({ queryKey: ["messages", id] });
  }
  async function block() {
    if (!q.data) return;
    setBusy(true); const { error } = await supabase.rpc("set_contact_block", { _request_id: q.data.conversation.request_id, _blocked: !q.data.blocked }); setBusy(false);
    if (error) toast.error(contactError(error)); else { await qc.invalidateQueries({ queryKey: ["messages", id] }); await qc.invalidateQueries({ queryKey: ["contact"] }); }
  }
  return <PageShell title={q.data?.conversation.pet_name ?? "Privat samtal"} back={<Button asChild variant="ghost" className="mb-4"><Link to="/meddelanden"><ArrowLeft /> Alla meddelanden</Link></Button>}>
    {q.isLoading && <p className="flex gap-2"><Loader2 className="animate-spin" /> Hämtar samtalet…</p>}
    {q.isError && <div><p className="text-destructive">Kunde inte hämta samtalet.</p><Button onClick={() => q.refetch()}>Försök igen</Button></div>}
    {q.isSuccess && !q.data && <p>Samtalet är inte tillgängligt.</p>}
    {q.data && <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><p className="text-sm text-muted-foreground">{q.data.conversation.owner_id === userId ? "Samtal med upphittaren" : "Samtal med ägaren"}</p><Button variant="ghost" size="sm" disabled={busy} onClick={block}><ShieldBan />{q.data.blocked ? "Ta bort blockering" : "Blockera kontakt"}</Button></div>
      <div role="log" aria-label="Meddelanden" aria-live="polite" className="max-h-[55vh] min-h-40 space-y-4 overflow-y-auto py-2">
        {!q.data.messages.length && <p className="text-sm text-muted-foreground">Inga meddelanden ännu.</p>}
        {q.data.messages.map((m) => <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg p-3 ${m.sender_id === userId ? "bg-primary-soft" : "bg-muted"}`}><p className="mb-1 text-xs font-semibold text-muted-foreground">{m.sender_id === userId ? "Du" : q.data.conversation.owner_id === m.sender_id ? "Ägaren" : "Upphittaren"}</p><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={m.created_at}>{timestamp(m.created_at)}</time></div></div>)}<div ref={bottom} />
      </div>
      {q.data.blocked ? <p className="text-sm text-muted-foreground">Du har blockerat kontakten. Samtalshistoriken finns kvar, men nya meddelanden stoppas.</p> : <form onSubmit={send} className="space-y-3 border-t pt-4"><Field label="Ditt meddelande" htmlFor="message" error={error}><Textarea id="message" value={body} maxLength={2000} rows={3} onChange={(e) => setBody(e.target.value)} /></Field><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Skicka meddelande</Button></form>}
    </div>}
  </PageShell>;
}