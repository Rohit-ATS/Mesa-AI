import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessageFeed, useUnreadCounts } from "./useMessages";

/** Header link to Messages with a live unread badge. Renders nothing for signed-out visitors. */
export function MessagesLink() {
  const [signedIn, setSignedIn] = useState(false);
  const { total, refresh } = useUnreadCounts(signedIn);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);
  useMessageFeed(signedIn, () => { void refresh(); }, true);
  if (!signedIn) return null;
  return (
    <Link to="/messages" className="relative inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-accent" aria-label={total ? `Messages, ${total} unread` : "Messages"}>
      <MessageSquare size={14} /> Messages
      {total > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{total > 99 ? "99+" : total}</span>}
    </Link>
  );
}
