import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LiveStatus = "connecting" | "live" | "offline";

// Notifications contain no order data. Each screen reloads through its existing
// role-protected query instead of trusting a change payload.
export function useMesaLiveUpdates(enabled: boolean, refresh: () => void) {
  const refreshRef = useRef(refresh);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`mesa-updates-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mesa_change_notice" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => { if (active) refreshRef.current(); }, 150);
      })
      .subscribe(state => {
        if (!active) return;
        if (state === "SUBSCRIBED") { setStatus("live"); refreshRef.current(); }
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("offline");
      });
    return () => { active = false; clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [enabled]);
  return status;
}
