import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot, ExternalLink, Send } from "lucide-react";

export type Message = { id: string; channel: string; sender_kind: string; sender_id: string | null; sender_label: string | null; title: string | null; body: string; link: string | null; created_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function MessageList({ messages, userId, empty, pending }: { messages: Message[]; userId: string | null; empty: string; pending?: string | null }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length, pending]);
  if (!messages.length && !pending) return <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-4 p-5">
      {messages.map(m => {
        const mine = m.sender_id != null && m.sender_id === userId;
        const system = m.sender_kind === "system";
        return (
          <article key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${mine ? "bg-secondary text-secondary-foreground" : system ? "w-full max-w-full border border-border bg-card" : "border border-border bg-accent text-accent-foreground"}`}>
              <div className={`flex flex-wrap items-center gap-2 text-xs ${mine ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
                {m.sender_kind === "assistant" && <Bot size={13} />}<span className="font-semibold">{mine ? "You" : m.sender_label || "Mesa"}</span><span>· {when(m.created_at)}</span>
              </div>
              {m.title && <h3 className="mt-1 font-semibold text-secondary">{m.title}</h3>}
              <p className="mt-1 whitespace-pre-wrap leading-6">{m.body}</p>
              {m.link && <Link to={m.link} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open <ExternalLink size={12} /></Link>}
            </div>
          </article>
        );
      })}
      {pending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Bot size={14} /> {pending}</p>}
      <div ref={end} />
    </div>
  );
}

export function Composer({ placeholder, hint, busy, onSend, validate }: { placeholder: string; hint?: string; busy: boolean; onSend: (text: string) => Promise<boolean>; validate?: (text: string) => string | null }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    const problem = validate?.(value);
    if (problem) { setError(problem); return; }
    setError("");
    if (await onSend(value)) setText("");
  }
  return (
    <form onSubmit={submit} className="border-t border-border p-4">
      <div className="flex gap-2">
        <textarea value={text} onChange={e => { setText(e.target.value); setError(""); }} maxLength={2000} rows={2} placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(e); } }}
          className="min-h-[3rem] flex-1 resize-none rounded-lg border border-input bg-background p-3 text-sm text-foreground" />
        <button disabled={busy || !text.trim()} className="inline-flex items-center gap-2 self-end rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"><Send size={15} /> Send</button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p> : hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </form>
  );
}
