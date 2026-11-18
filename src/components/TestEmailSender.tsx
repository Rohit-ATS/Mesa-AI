import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type TestEmail = { subject: string; html: string };
type Props = { inquiryId: string; owner: TestEmail; kitchen: TestEmail };

export function TestEmailSender({ inquiryId, owner, kitchen }: Props) {
  const [recipient, setRecipient] = useState("");
  const [audience, setAudience] = useState<"owner" | "kitchen">("owner");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true); setResult(null);
    const email = audience === "owner" ? owner : kitchen;
    const { data, error } = await supabase.functions.invoke("mesa-test-email-3759b04e315c", { body: { inquiryId, recipient: recipient.trim(), audience, subject: email.subject, html: email.html, permissionConfirmed: confirmed } });
    let text = data?.message as string | undefined;
    if (error && "context" in error && error.context instanceof Response) text = (await error.context.json().catch(() => null))?.message;
    setResult({ ok: !error, text: text || (error ? "The test email could not be sent." : "Sent.") });
    setBusy(false);
    if (!error) setConfirmed(false);
  }

  const valid = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient.trim());
  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl text-secondary"><Mail size={21} /> Send test to…</h2>
      <p className="mt-2 text-sm text-muted-foreground">Sends one test copy of the selected preview through the connected Gmail account. Nothing is sent automatically.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <select aria-label="Email version" value={audience} onChange={e => setAudience(e.target.value as "owner" | "kitchen")} className="rounded-lg border border-input bg-background p-3 text-sm">
          <option value="owner">Owner email</option>
          <option value="kitchen">Kitchen email</option>
        </select>
        <input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} aria-label="Team test email address" placeholder="Team email address" className="w-full max-w-sm rounded-lg border border-input bg-background p-3 text-sm" />
        <button onClick={send} disabled={busy || !valid || !confirmed} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send test"}</button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> This is a team address and the recipient has agreed to receive test emails.</label>
      {result && <p role="status" className={`mt-3 text-sm ${result.ok ? "text-secondary" : "text-destructive"}`}>{result.text}</p>}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} /> Owner-only · Approved demo orders only</p>
    </div>
  );
}
