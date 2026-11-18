import { useEffect, useState } from "react";
import { Bot, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"mesa_auto_proposal">;
const emailLabel: Record<string, string> = { accepted: "Accepted by Gmail (delivery not confirmed)", failed: "Failed", unknown: "Result unknown — check the inbox before resending", skipped: "Not sent" };

export function AutoProposalPanel({ inquiryId }: { inquiryId: string }) {
  const [run, setRun] = useState<Run | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true; let timer: number | undefined;
    async function load() {
      const { data } = await supabase.from("mesa_auto_proposal").select("*").eq("inquiry_id", inquiryId).maybeSingle();
      if (!alive) return;
      setRun(data); setLoaded(true);
      if (data?.status === "running") timer = window.setTimeout(load, 4000);
    }
    void load();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [inquiryId]);

  if (!loaded || !run) return null;
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl text-secondary"><Bot size={22} /> Automatic workup</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ran when the inquiry was submitted: research brief, draft quote, customer proposal draft and owner email. Advisory only — review before approving.</p>
      {run.status === "running" ? <p className="mt-4 text-sm">Working on it…</p> : <>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><strong>Draft quote:</strong> {run.quote_id ? "Saved" : `Not saved${run.calculation_error ? ` — ${run.calculation_error}` : ""}`}</p>
          <p className="flex items-center gap-1.5"><Mail size={14} /><strong>Owner email:</strong> {emailLabel[run.email_status ?? "skipped"]}</p>
        </div>
        {run.estimated_fields.length > 0 && <p className="mt-3 rounded-lg bg-accent p-3 text-sm">Estimated inputs used: {run.estimated_fields.join("; ")}. Confirm these with the customer.</p>}
        {run.error && <p role="alert" className="mt-3 text-sm text-destructive">{run.error}</p>}
        {run.research_brief && <details open className="mt-5"><summary className="cursor-pointer font-semibold text-secondary">Research brief</summary><p className="mt-3 whitespace-pre-line text-sm leading-6">{run.research_brief}</p></details>}
        {run.proposal_draft && <details className="mt-4"><summary className="cursor-pointer font-semibold text-secondary">Customer proposal draft (not sent)</summary><p className="mt-3 whitespace-pre-line rounded-lg bg-background p-4 text-sm leading-6">{run.proposal_draft}</p></details>}
      </>}
    </section>
  );
}
