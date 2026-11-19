import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Bot, ChefHat, LockKeyhole, MessagesSquare, Plus, Sparkles } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { supabase } from "@/integrations/supabase/client";
import { Composer, MessageList, type Message } from "@/components/messages/MessageThread";
import { markRead, useMessageFeed, useUnreadCounts } from "@/components/messages/useMessages";

type Role = "owner" | "kitchen";
type Conversation = { id: string; title: string; updated_at: string };
type Selection = { kind: "owner" | "kitchen" | "team" } | { kind: "assistant"; id: string | null };
const MONEY = /([$€£¥]\s*\d)|(\d[\d.,]*\s*(usd|dollars?|bucks)\b)/i;
const keyOf = (s: Selection) => (s.kind === "assistant" ? (s.id ? `assistant:${s.id}` : null) : s.kind);

export default function Messages() {
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState<Selection>({ kind: "team" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  const { counts, refresh: refreshCounts } = useUnreadCounts(!!role);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        const { data: staff } = await supabase.from("mesa_staff").select("role").eq("user_id", user.id).maybeSingle();
        if (staff?.role === "owner" || staff?.role === "kitchen") {
          setRole(staff.role); setUserId(user.id);
          setSelected(staff.role === "owner" ? { kind: "owner" } : { kind: "kitchen" });
        }
      }
      setChecked(true);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!role) return;
    const query = supabase.from("mesa_message").select("id,channel,sender_kind,sender_id,sender_label,title,body,link,created_at").order("created_at", { ascending: true }).limit(200);
    const filtered = selected.kind === "assistant" ? (selected.id ? query.eq("conversation_id", selected.id) : null) : query.eq("channel", selected.kind);
    const [msgs, convos] = await Promise.all([
      filtered ?? Promise.resolve({ data: [] as Message[], error: null }),
      role === "owner" ? supabase.from("mesa_assistant_conversation").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] as Conversation[], error: null }),
    ]);
    if (msgs.error) setError("Messages could not be loaded. Please try again."); else { setMessages((msgs.data as Message[]) ?? []); setError(""); }
    setConversations((convos.data as Conversation[]) ?? []);
    const key = keyOf(selected);
    if (key) await markRead(key);
    await refreshCounts();
  }, [role, selected, refreshCounts]);

  useEffect(() => { void load(); }, [load]);
  const live = useMessageFeed(!!role, () => { void load(); });

  async function sendTeam(text: string) {
    setBusy(true);
    const { error: sendError } = await supabase.from("mesa_message").insert({ channel: "team", sender_kind: "user", sender_id: userId, sender_label: role === "owner" ? "Owner" : "Kitchen" , body: text });
    setBusy(false);
    if (sendError) { setError(sendError.message.includes("row-level security") ? "That message wasn't sent. Team chat can't include prices or dollar amounts." : "Message not sent. Please try again."); return false; }
    void load(); return true;
  }

  async function askAssistant(text: string) {
    if (selected.kind !== "assistant") return false;
    setBusy(true); setPending("Thinking…"); setError("");
    const { data, error: fnError } = await supabase.functions.invoke("mesa-owner-assistant-3759b04e315c", { body: { conversationId: selected.id, message: text } });
    setBusy(false); setPending(null);
    if (fnError || !data?.conversationId) {
      let detail = "The assistant couldn't answer. Please try again.";
      if (fnError && "context" in fnError && fnError.context instanceof Response) detail = (await fnError.context.json().catch(() => null))?.message ?? detail;
      setError(detail); return false;
    }
    if (selected.id !== data.conversationId) setSelected({ kind: "assistant", id: data.conversationId }); else void load();
    return true;
  }

  const channels = useMemo(() => [
    ...(role === "owner" ? [{ kind: "owner" as const, label: "Owner alerts", note: "New inquiries & proposals", icon: Sparkles }] : []),
    { kind: "kitchen" as const, label: "Kitchen alerts", note: "Prep reminders on event day", icon: ChefHat },
    { kind: "team" as const, label: "Team chat", note: "Owner and kitchen staff", icon: MessagesSquare },
  ], [role]);

  const title = selected.kind === "assistant" ? (conversations.find(c => c.id === selected.id)?.title ?? "New conversation") : channels.find(c => c.kind === selected.kind)?.label;
  const back = role === "kitchen" ? "/kitchen" : "/owner";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-display text-2xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link>
        <div className="flex items-center gap-4"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesa / Messages</span>{role && <SignOutButton />}</div>
      </div></header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        {!checked ? <p className="text-muted-foreground">Loading…</p> : !role ? (
          <div className="rounded-xl border border-border bg-card p-10"><LockKeyhole className="text-primary" /><h1 className="mt-4 font-display text-3xl text-secondary">Staff only</h1><p className="mt-3 text-muted-foreground">Sign in with an owner or kitchen account to use Messages.</p><Link to="/staff-login" className="mt-5 inline-block text-sm font-semibold text-primary">Go to staff sign in →</Link></div>
        ) : <>
          <Link to={back} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to {role === "kitchen" ? "kitchen" : "inbox"}</Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div><div className="eyebrow">MESA</div><h1 className="mt-3 font-display text-4xl text-secondary">Messages</h1></div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span role="status" className={live === "offline" ? "font-semibold text-destructive" : "text-muted-foreground"}>{live === "live" ? "Live — new messages appear instantly" : live === "offline" ? "Live updates disconnected — messages may be out of date. Refresh the page." : "Connecting…"}</span>
              {permission === "default" && <button type="button" onClick={() => void Notification.requestPermission().then(setPermission)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-semibold text-secondary"><Bell size={13} /> Enable browser notifications</button>}
            </div>
          </div>
          <div className="mt-6 grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[18rem_1fr]">
            <nav aria-label="Conversations" className="border-b border-border p-3 lg:border-b-0 lg:border-r">
              {channels.map(c => {
                const unread = counts[c.kind] ?? 0; const on = selected.kind === c.kind;
                return <button key={c.kind} type="button" onClick={() => setSelected({ kind: c.kind })} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left ${on ? "bg-accent" : "hover:bg-accent/60"}`}>
                  <c.icon size={18} className="mt-0.5 text-primary" /><span className="flex-1"><span className="block text-sm font-semibold text-secondary">{c.label}</span><span className="block text-xs text-muted-foreground">{c.note}</span></span>
                  {unread > 0 && <span className="rounded-full bg-primary px-2 text-[11px] font-bold text-primary-foreground">{unread}</span>}
                </button>;
              })}
              {role === "owner" && <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between px-3"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Bot size={14} /> Business assistant</span>
                  <button type="button" onClick={() => setSelected({ kind: "assistant", id: null })} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus size={13} /> New</button></div>
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {conversations.map(c => { const on = selected.kind === "assistant" && selected.id === c.id; const unread = counts[`assistant:${c.id}`] ?? 0;
                    return <button key={c.id} type="button" onClick={() => setSelected({ kind: "assistant", id: c.id })} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${on ? "bg-accent font-semibold text-secondary" : "text-secondary hover:bg-accent/60"}`}><span className="truncate">{c.title}</span>{unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}</button>; })}
                  {!conversations.length && <p className="px-3 py-2 text-xs text-muted-foreground">No conversations yet.</p>}
                </div>
              </div>}
            </nav>
            <section className="flex min-h-[32rem] flex-col">
              <div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-secondary">{title}</h2>
                {selected.kind === "assistant" && <p className="mt-1 text-xs text-muted-foreground">Answers only from Mesa's records — past and upcoming orders, quotes, customers and menu. Advisory only: it can't change orders or send anything. Costs and prices are demo values. AI use may incur charges.</p>}
                {selected.kind === "team" && <p className="mt-1 text-xs text-muted-foreground">Visible to the owner and kitchen staff. Prices and dollar amounts are blocked here.</p>}
              </div>
              <div className="flex-1 overflow-y-auto">
                <MessageList messages={messages} userId={userId} pending={pending}
                  empty={selected.kind === "assistant" ? "Ask about your business — e.g. \"What's booked next week?\", \"Which quotes are waiting on the customer?\" or \"Which dishes are ordered most?\"" : selected.kind === "owner" ? "New inquiry proposals will appear here." : selected.kind === "kitchen" ? "Prep reminders appear here one hour before each released order's suggested prep start." : "No team messages yet."} />
              </div>
              {error && <p role="alert" className="px-5 pb-2 text-sm text-destructive">{error}</p>}
              {selected.kind === "team" && <Composer placeholder="Message the team…" busy={busy} onSend={sendTeam} hint="Enter to send · Shift+Enter for a new line" validate={t => (MONEY.test(t) ? "Team chat can't include prices or dollar amounts, so the kitchen never sees pricing." : null)} />}
              {selected.kind === "assistant" && <Composer placeholder="Ask about orders, customers, dishes or quotes…" busy={busy} onSend={askAssistant} hint="Enter to send · Shift+Enter for a new line" />}
            </section>
          </div>
        </>}
      </div>
    </main>
  );
}
