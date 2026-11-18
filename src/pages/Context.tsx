import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type ContextRow = { id: string; section: string; content: string; updated_at: string };
export default function Context() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [rows, setRows] = useState<ContextRow[]>([]); const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setRows([]); return; }
    supabase.from("business_context").select("id, section, content, updated_at").order("section").then(({ data, error }) => {
      if (error) setMessage(error.message); else if (!data?.length) setMessage("This account does not have owner access. Contact the administrator."); else { setRows(data); setMessage(""); }
    });
  }, [session]);
  async function authenticate(signup: boolean) {
    setMessage("");
    const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } }) : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message); else if (signup) setMessage("Check your email to confirm your account. Staff access must be assigned separately.");
  }
  async function save(row: ContextRow) {
    const { data, error } = await supabase.from("business_context").update({ content: row.content }).eq("id", row.id).select("id, section, content, updated_at").maybeSingle();
    if (error || !data) { setMessage(error?.message || "Could not save this section."); return; }
    setRows(previous => previous.map(item => item.id === row.id ? data : item)); setMessage(`${row.section.replaceAll("_", " ")} saved.`);
  }
  return <main className="min-h-screen bg-background px-6 py-10"><div className="mx-auto max-w-4xl"><a href="/inquire" className="font-display text-xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></a><div className="mt-12 flex flex-wrap justify-between gap-4"><div><div className="eyebrow">MESA / OWNER ONLY</div><h1 className="mt-3 font-display text-4xl text-secondary">Business context</h1><p className="mt-3 text-muted-foreground">The shared foundation for La Bandera Kitchen.</p></div>{session && <button onClick={() => supabase.auth.signOut()} className="self-start rounded-lg border border-border px-4 py-2 text-sm">Sign out</button>}</div>{message && <p role="status" className="mt-6 rounded-lg bg-accent p-4 text-sm">{message}</p>}{session && rows.length > 0 && <section className="mt-8 rounded-xl border border-border bg-card p-6"><h2 className="font-display text-2xl text-secondary">Prototype boundaries</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Standalone demo. No connection to La Bandera Kitchen&apos;s live systems.</li><li>All customer records are fictional.</li><li>No live payments. Deposit amounts are illustrative only.</li><li>No messages are sent to real customers.</li><li>Complements, does not replace, existing development work.</li></ul></section>}{loading ? <p className="mt-8">Loading…</p> : !session ? <div className="mt-8 max-w-md space-y-4 rounded-xl border border-border bg-card p-6"><h2 className="font-display text-2xl text-secondary">Staff sign in</h2><label className="block text-sm">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label><label className="block text-sm">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label><div className="flex gap-3"><button onClick={() => authenticate(false)} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Sign in</button><button onClick={() => authenticate(true)} className="rounded-lg border border-border px-5 py-3 text-sm">Create account</button></div><p className="text-xs text-muted-foreground">Creating an account does not grant staff access.</p></div> : <div className="mt-8 space-y-5">{rows.map(row => <section key={row.id} className="rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-display text-2xl capitalize text-secondary">{row.section.replaceAll("_", " ")}</h2><span className="text-xs text-muted-foreground">Updated {new Date(row.updated_at).toLocaleString()}</span></div><textarea value={row.content} onChange={e => setRows(previous => previous.map(item => item.id === row.id ? { ...item, content: e.target.value } : item))} rows={6} className="mt-4 w-full rounded-lg border border-input bg-background p-4 text-sm leading-6" /><button onClick={() => save(row)} className="mt-3 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Save section</button></section>)}</div>}</div></main>;
}
