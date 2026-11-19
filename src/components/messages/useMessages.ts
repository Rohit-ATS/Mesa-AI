import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Subscribes to new Mesa messages. Payloads are never trusted for display — callers refetch
 * through role-protected queries. Optionally shows a browser notification while the tab is hidden.
 */
export function useMessageFeed(enabled: boolean, onMessage: () => void, notify = false) {
  const callback = useRef(onMessage);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  useEffect(() => { callback.current = onMessage; }, [onMessage]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`mesa-messages-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mesa_message" }, payload => {
        const row = payload.new as { title?: string | null; sender_label?: string | null; channel?: string };
        if (notify && document.hidden && "Notification" in window && Notification.permission === "granted" && row.channel !== "assistant") {
          new Notification(row.title || `New message from ${row.sender_label || "Mesa"}`, { body: "Open Mesa Messages to read it.", tag: "mesa-message" });
        }
        clearTimeout(timer);
        timer = setTimeout(() => { if (active) callback.current(); }, 150);
      })
      .subscribe(state => {
        if (!active) return;
        if (state === "SUBSCRIBED") { setStatus("live"); callback.current(); }
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("offline");
      });
    return () => { active = false; clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [enabled, notify]);
  return status;
}

/** Unread counts per channel key ("owner", "kitchen", "team", "assistant:<id>") for the signed-in staff member. */
export function useUnreadCounts(enabled: boolean) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("mesa_unread_counts");
    setCounts((data as Record<string, number> | null) ?? {});
  }, []);
  return { counts, refresh, total: Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0), enabled };
}

export async function markRead(channelKey: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("mesa_message_read").upsert({ user_id: data.user.id, channel_key: channelKey, last_read_at: new Date().toISOString() });
}
