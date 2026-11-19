import { useState } from "react";
import { CheckCircle2, ChefHat, Clock3, Mail, Send, Undo2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { linesForApproval, type CustomerQuote } from "@/lib/customerQuote";
import type { QuoteData } from "./useCustomerQuoteData";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });
const emailLabel: Record<string, string> = { accepted: "accepted by Gmail", failed: "failed to send", unknown: "result unknown — check the sent folder before resending", skipped: "not sent" };
type Action = "approve_quote" | "release" | "decline" | "cancel";

export function QuoteWorkflow({ inquiryId, data, quote, internalQuote, onChanged }: { inquiryId: string; data: QuoteData; quote: CustomerQuote; internalQuote?: Json; onChanged: (status: string) => void }) {
  const [email, setEmail] = useState(data.customerEmail ?? "");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const latest = data.versions[0];
  const open = latest && (latest.status === "sent" || latest.status === "accepted") ? latest : null;
  const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim());
  const changedSinceSent = open && Math.abs(open.total - quote.total) > 0.004;

  async function run(action: Action) {
    if (busy) return;
    if (action === "decline" && !window.confirm("Decline this inquiry? It will move to the declined list in CRM.")) return;
    if (action === "cancel" && !window.confirm(`Cancel quote v${latest?.version}? The customer's Accept link will stop working.`)) return;
    if (action === "release" && !window.confirm("Release this order to the kitchen? This creates the kitchen ticket and emails the customer a confirmation.")) return;
    setBusy(action); setMessage(null);
    if (action === "cancel") {
      const { error } = await supabase.rpc("mesa_cancel_quote_version", { p_inquiry_id: inquiryId });
      setBusy(null);
      setMessage(error ? { ok: false, text: error.message } : { ok: true, text: "Quote cancelled. Edit and approve a new version when ready." });
      if (!error) onChanged("new");
      return;
    }
    const body = action === "approve_quote"
      ? { action, inquiryId, customerEmail: email.trim(), lines: linesForApproval(quote), quote: internalQuote ?? null, origin: window.location.origin }
      : { action, inquiryId };
    const { data: result, error } = await supabase.functions.invoke("mesa-decide-inquiry-3759b04e315c", { body });
    let text = result?.message as string | undefined;
    if (error && "context" in error && error.context instanceof Response) text = (await error.context.json().catch(() => null))?.message;
    setBusy(null);
    if (error) { setMessage({ ok: false, text: text || "That step could not be completed. Please try again." }); return; }
    setMessage({ ok: result?.emailStatus !== "failed" && result?.emailStatus !== "unknown", text: text || "Saved." });
    onChanged(action === "approve_quote" ? "quoted" : action === "release" ? "approved" : "declined");
  }

  if (data.status === "declined") return <Shell><p className="flex items-center gap-2 font-semibold text-secondary"><XCircle size={18} className="text-destructive" /> Declined — listed under Declined in CRM.</p><Note message={message} /></Shell>;
  if (data.release) return (
    <Shell>
      <Steps step={4} />
      <p className="mt-5 flex items-center gap-2 font-semibold text-secondary"><ChefHat size={18} className="text-primary" /> Released to the kitchen {when(data.release.released_at)} — v{data.versions.find(v => v.id === data.release!.version_id)?.version ?? "?"} is the kitchen ticket.</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Mail size={15} /> Customer confirmation {emailLabel[data.release.email_status ?? "skipped"]}{data.release.customer_email ? ` · ${data.release.customer_email}` : ""}</p>
      <Note message={message} />
    </Shell>
  );
  if (data.status === "approved") return <Shell><p className="flex items-center gap-2 font-semibold text-secondary"><ChefHat size={18} className="text-primary" /> On the kitchen board — approved before the three-step process.</p><Note message={message} /></Shell>;

  const step = !open ? 1 : open.status === "sent" ? 2 : 3;
  return (
    <Shell>
      <Steps step={step} />
      {open && (
        <div className="mt-5 rounded-lg bg-accent p-4 text-sm">
          {open.status === "sent"
            ? <p className="flex items-center gap-2 font-semibold text-secondary"><Clock3 size={16} /> Quote v{open.version} sent {when(open.created_at)} — waiting for the customer to accept ({money(open.total)}{open.tax_amount == null ? " before tax" : ""}).</p>
            : <p className="flex items-center gap-2 font-semibold text-secondary"><CheckCircle2 size={16} className="text-status-green" /> Customer accepted v{open.version} · {when(open.accepted_at!)}</p>}
          <p className="mt-1 flex items-center gap-2 text-muted-foreground"><Mail size={14} /> Quote email to {open.customer_email} {emailLabel[open.email_status ?? "skipped"] ?? "pending"}{open.email_error ? ` (${open.email_error})` : ""}</p>
          {changedSinceSent && <p className="mt-2 font-semibold text-destructive">The lines above differ from v{open.version}. Approving again sends v{open.version + 1}; the customer must accept the new version{open.status === "accepted" ? " before you can release" : ""}.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="mt-5">
          <button onClick={() => run("release")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"><ChefHat size={17} /> {busy === "release" ? "Releasing…" : `Release v${open!.version} to kitchen`}</button>
          <p className="mt-2 text-xs text-muted-foreground">Creates one kitchen ticket from the accepted v{open!.version} lines (including alternatives) and emails the customer a confirmation.</p>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-semibold text-secondary">{open ? `Send a revised quote (v${open.version + 1})` : `Approve quote v${(latest?.version ?? 0) + 1} and email the customer`}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Freezes the lines above and emails the customer an itemised quote with an <strong>Accept this quote</strong> button. Nothing reaches the kitchen at this step.</p>
        <label className="mt-4 block max-w-md text-sm font-semibold text-secondary">Customer email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm font-normal text-foreground" />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-secondary"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="h-4 w-4 accent-primary" /> I&apos;ve confirmed we&apos;re available on this date.</label>
        {quote.blocking.length > 0 && <ul className="mt-4 space-y-1 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{quote.blocking.map(b => <li key={b}>{b}</li>)}</ul>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => run("approve_quote")} disabled={!!busy || !validEmail || !available || quote.blocking.length > 0} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-40"><Send size={16} /> {busy === "approve_quote" ? "Sending…" : open ? `Approve & send v${open.version + 1}` : "Approve quote & email customer"}</button>
          {open?.status === "sent" && <button onClick={() => run("cancel")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-secondary disabled:opacity-40"><Undo2 size={16} /> Cancel sent quote</button>}
          <button onClick={() => run("decline")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-destructive px-5 py-3 text-sm font-semibold text-destructive disabled:opacity-40"><XCircle size={16} /> {busy === "decline" ? "Declining…" : "Decline"}</button>
        </div>
        {!validEmail && <p className="mt-3 text-xs text-muted-foreground">Add the customer&apos;s email to send the quote.</p>}
      </div>
      <Note message={message} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="mt-8 rounded-xl border border-border bg-card p-6"><h2 className="font-display text-2xl text-secondary">Approval</h2>{children}</section>;
}

function Note({ message }: { message: { ok: boolean; text: string } | null }) {
  return message ? <p role="status" className={`mt-4 text-sm ${message.ok ? "text-secondary" : "text-destructive"}`}>{message.text}</p> : null;
}

const STEP_LABELS = ["Owner approves quote", "Customer accepts latest quote", "Owner releases to kitchen"];
function Steps({ step }: { step: number }) {
  return (
    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
      {STEP_LABELS.map((label, index) => {
        const n = index + 1; const done = n < step; const current = n === step;
        return <li key={label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${current ? "border-primary bg-primary/5 font-semibold text-secondary" : done ? "border-status-green/40 text-secondary" : "border-border text-muted-foreground"}`}>
          {done ? <CheckCircle2 size={16} className="text-status-green" /> : <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">{n}</span>}{label}
        </li>;
      })}
    </ol>
  );
}
