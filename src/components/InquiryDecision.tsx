import { useEffect, useState } from "react";
import { CheckCircle2, ChefHat, Mail, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

type Decision = Tables<"mesa_inquiry_decision">;
type Props = { inquiryId: string; status: string; customerEmail: string | null; quote?: Json; onDecided: (decision: "approved" | "declined") => void };
const emailLabel: Record<string, string> = { accepted: "Customer confirmation accepted by Gmail", failed: "Customer confirmation failed", unknown: "Customer confirmation result unknown — check the sent folder", skipped: "Customer confirmation not sent" };

export function InquiryDecision({ inquiryId, status, customerEmail, quote, onDecided }: Props) {
  const [email, setEmail] = useState(customerEmail ?? "");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState<"approved" | "declined" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [record, setRecord] = useState<Decision | null>(null);
  const decided = status === "approved" || status === "declined";

  useEffect(() => {
    if (!decided) return;
    void supabase.from("mesa_inquiry_decision").select("*").eq("inquiry_id", inquiryId).maybeSingle().then(({ data }) => setRecord(data));
  }, [decided, inquiryId]);

  async function decide(decision: "approved" | "declined") {
    if (busy) return;
    if (decision === "declined" && !window.confirm("Decline this inquiry? It will move to the declined list in CRM.")) return;
    setBusy(decision); setMessage(null);
    const { data, error } = await supabase.functions.invoke("mesa-decide-inquiry-3759b04e315c", { body: { inquiryId, decision, customerEmail: email.trim(), quote: quote ?? null } });
    let text = data?.message as string | undefined;
    if (error && "context" in error && error.context instanceof Response) text = (await error.context.json().catch(() => null))?.message;
    setBusy(null);
    if (error) { setMessage({ ok: false, text: text || "The decision could not be saved. Please try again." }); return; }
    setMessage({ ok: data?.emailStatus !== "failed" && data?.emailStatus !== "unknown", text: text || "Saved." });
    onDecided(decision);
  }

  const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim());
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-2xl text-secondary">Decision</h2>
      {decided ? (
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 font-semibold text-secondary">{status === "approved" ? <><CheckCircle2 size={18} className="text-primary" /> Approved — on the kitchen schedule for the event day.</> : <><XCircle size={18} className="text-destructive" /> Declined — listed under Declined in CRM.</>}</p>
          {record?.decision === "approved" && <p className="flex items-center gap-2 text-muted-foreground"><Mail size={15} /> {emailLabel[record.email_status ?? "skipped"]}{record.customer_email ? ` · ${record.customer_email}` : ""}</p>}
          {message && <p role="status" className={message.ok ? "text-secondary" : "text-destructive"}>{message.text}</p>}
        </div>
      ) : <>
        <p className="mt-2 text-sm text-muted-foreground">Approve sends the order to the kitchen for the event day and emails the customer a confirmation. Decline moves it to the declined list in CRM.</p>
        <label className="mt-5 block max-w-md text-sm font-semibold text-secondary">Customer email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm font-normal text-foreground" />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-secondary"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="h-4 w-4 accent-primary" /> I&apos;ve confirmed we&apos;re available on this date.</label>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => decide("approved")} disabled={!!busy || !validEmail || !available} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"><ChefHat size={17} /> {busy === "approved" ? "Approving…" : "Approve"}</button>
          <button onClick={() => decide("declined")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-destructive px-6 py-3 text-sm font-semibold text-destructive disabled:opacity-40"><XCircle size={17} /> {busy === "declined" ? "Declining…" : "Decline"}</button>
        </div>
        {!validEmail && <p className="mt-3 text-xs text-muted-foreground">Add the customer&apos;s email to approve.</p>}
        {message && <p role="alert" className={`mt-3 text-sm ${message.ok ? "text-secondary" : "text-destructive"}`}>{message.text}</p>}
      </>}
    </section>
  );
}
