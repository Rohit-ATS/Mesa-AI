import { useEffect, useRef, useState } from "react";
import { HttpAgent } from "@enter-pro/agent-client";
import { ThreadClient, ThreadManager, toThreadTurnsFromAgUiHistory, type ThreadTurn } from "@enter-pro/thread-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const base = `${SUPABASE_URL}/functions/v1/mesa-intake-agent-3759b04e315c`;
const sessionKey = "mesa-intake-session";
const threadKey = "mesa-intake-thread";
function getSession() {
  let session = sessionStorage.getItem(sessionKey);
  if (!session) { session = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join(""); sessionStorage.setItem(sessionKey, session); }
  return session;
}
async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers); headers.set("Authorization", `Bearer ${getSession()}`); headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message || "The assistant is unavailable. Please try again."); }
  return response.json();
}
export function IntakeAgent() {
  const [turns,setTurns] = useState<readonly ThreadTurn[]>([]); const [input,setInput] = useState(""); const [running,setRunning] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const manager = useRef(new ThreadManager()); const clientRef = useRef<ThreadClient | null>(null); const agentRef = useRef<HttpAgent | null>(null); const setupRef = useRef<Promise<ThreadClient> | null>(null);
  useEffect(() => { const instance = manager.current; return () => { void instance.dispose(); }; }, []);
  async function setup() {
    if (clientRef.current) return clientRef.current;
    if (setupRef.current) return setupRef.current;
    setupRef.current = (async () => {
      let id = sessionStorage.getItem(threadKey); let thread;
      if (id) thread = await request(`/threads/${encodeURIComponent(id)}`);
      else { thread = await request("/threads", { method:"POST",body:"{}" }); id = thread.thread_id; if (!id) throw new Error("Could not create a conversation."); sessionStorage.setItem(threadKey,id); }
      const threadId = id!;
      const agent = new HttpAgent({ threadId, url:()=>`${base}/run`, token:getSession, abortUrl:()=>agent.activeTurnId == null ? "" : `${base}/threads/${encodeURIComponent(threadId)}/turns/${agent.activeTurnId}/cancel`, resumeUrl:()=>`${base}/threads/${encodeURIComponent(threadId)}/turns/${agent.activeTurnId}/events` });
      const client = new ThreadClient({ threadId, agent, historyMessageLoader:{ async load(_id,start,end) { const result = await request(`/threads/${encodeURIComponent(threadId)}/turns?start_turn=${start}&end_turn=${end}`); return toThreadTurnsFromAgUiHistory(result); }, async loadSince(){ return []; } }, historyMessagePagination:{turnSize:20,endTurn:thread.latest_history_turn_id || 0} });
      client.subscribe(() => { setTurns([...client.turns]); setRunning(client.isAgentRunning); });
      manager.current.register(threadId,client); await manager.current.resume(threadId); clientRef.current=client; agentRef.current=agent; setTurns([...client.turns]);
      if(thread.running) void agent.resumeTurn(thread.running).catch(() => setError("Could not resume the previous response."));
      return client;
    })();
    try { return await setupRef.current; } finally { setupRef.current = null; }
  }
  function prepareOnFocus() { void setup().catch(err => setError(err instanceof Error ? err.message : "Unable to connect to the assistant.")); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); const message=input.trim(); if (!message || busy || running) return; setBusy(true); setError("");
    try { const client = await setup(); setInput(""); await client.sendMessage({ content:message, sentAt:Date.now() }); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to reach the assistant."); }
    finally { setBusy(false); }
  }
  return <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"><div className="border-b border-border px-6 py-5"><h2 className="font-display text-xl font-bold text-secondary">Chat with Sazón Catering</h2><p className="mt-1 text-xs text-muted-foreground">Demo only · Please use synthetic or anonymized information.</p></div><div className="max-h-[45vh] min-h-[240px] space-y-4 overflow-y-auto px-6 py-6" aria-live="polite"><p className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">¡Hola! Tell us about your gathering and what you’re looking for.</p>{turns.flatMap(turn=>turn.messages).map(item => {
    if(item.kind === "custom") { if(item.event.name === "agent.turn.error") return <p key={item.id} role="alert" className="text-sm text-destructive">The assistant encountered an error. Please try again.</p>; if(item.event.name === "agent.turn.cancelled") return <p key={item.id} className="text-sm text-muted-foreground">Response cancelled.</p>; return null; }
    const message=item.message;
    if(message.role === "user" && typeof message.content === "string") return <div key={item.id} className="ml-auto max-w-md rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">{message.content}</div>;
    if(message.role === "assistant") return <div key={item.id} className="space-y-2">{message.content && typeof message.content === "string" && <div className="prose prose-sm max-w-none rounded-xl bg-accent p-4 text-accent-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]}>{/\p{Sc}|\b(?:USD|dollars?)\b/iu.test(message.content) ? "This response contains pricing, which is not displayed during intake. Please ask about the menu or your event details instead." : message.content}</ReactMarkdown></div>}{message.toolCalls?.length ? <details className="text-sm text-muted-foreground"><summary>Assistant actions</summary>{message.toolCalls.map(tool=><p key={tool.id}>{tool.function.name}</p>)}</details> : null}</div>;
    return null;
  })}{(running || busy) && <p className="text-sm text-muted-foreground">Sazón is responding…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div><form onSubmit={send} className="flex gap-2 border-t border-border p-5"><input aria-label="Message Sazón Catering" onFocus={prepareOnFocus} value={input} onChange={event=>setInput(event.target.value)} placeholder="Tell us about your event…" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm"/><button disabled={!input.trim() || busy || running} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">Send</button>{(running || busy) && <button type="button" onClick={()=>clientRef.current?.abort()} className="rounded-lg border border-border px-4 py-3 text-sm">Stop</button>}</form><p className="px-5 pb-4 text-xs text-muted-foreground">Confirm your event details in the request card before submitting your demo inquiry.</p></div>;
}
