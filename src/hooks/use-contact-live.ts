import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContactLive(userId: string | undefined) {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(false);
    if (!userId) return;
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["contact"] }); void qc.invalidateQueries({ queryKey: ["messages"] }); };
    const channel = supabase.channel(`contact-${userId}-${crypto.randomUUID()}`);
    for (const table of ["contact_requests", "conversations", "messages", "notifications"] as const) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe((status) => { setLive(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") refresh(); });
    // Keep delivery reliable if a device sleeps or the live connection is interrupted.
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); void supabase.removeChannel(channel); };
  }, [userId, qc]);
  return live;
}