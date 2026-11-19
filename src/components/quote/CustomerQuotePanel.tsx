import { useMemo } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { buildCustomerQuote } from "@/lib/customerQuote";
import { useCustomerQuoteData } from "./useCustomerQuoteData";
import { QuoteLinesTable } from "./QuoteLinesTable";
import { AccommodationsPanel } from "./AccommodationsPanel";
import { QuoteWorkflow } from "./QuoteWorkflow";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

/** Customer quote lines, allergies/preferences and the three-step approval for one inquiry. */
export function CustomerQuotePanel({ inquiryId, internalCost, internalQuote, onStatus }: { inquiryId: string; internalCost?: number | null; internalQuote?: Json; onStatus: (status: string) => void }) {
  const { data, error, overrides, sfSurcharge, saveState, updateOverrides, updateSf, reload } = useCustomerQuoteData(inquiryId);
  const quote = useMemo(() => data && buildCustomerQuote({ event: data.event, dishes: data.dishes, accommodations: data.accommodations, settings: data.settings, sfSurcharge, overrides }), [data, sfSurcharge, overrides]);
  if (error) return <p role="alert" className="mt-8 rounded-lg border border-destructive bg-card p-4 text-sm text-destructive">{error}</p>;
  if (!data || !quote) return <p className="mt-8 text-sm text-muted-foreground">Loading customer quote…</p>;
  const locked = data.status === "approved" || data.status === "declined" || !!data.release;
  const margin = internalCost != null && quote.subtotal > 0 ? (quote.subtotal - internalCost) / quote.subtotal : null;
  const green = data.settings.margin_green_threshold ?? 0.3; const yellow = data.settings.margin_yellow_threshold ?? 0.2;
  const flag = margin == null ? null : margin >= green ? "green" : margin >= yellow ? "yellow" : "red";

  return (
    <>
      <AccommodationsPanel inquiryId={inquiryId} guests={data.event.guests} dishes={data.dishes} menu={data.menu} accommodations={data.accommodations} dietaryFlags={data.dietaryFlags} breakdownRecorded={data.breakdownRecorded} locked={locked} onSaved={reload} />
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="eyebrow">WHAT THE CUSTOMER SEES</div><h2 className="mt-3 font-display text-3xl text-secondary">Customer quote</h2>
            <p className="mt-2 text-sm text-muted-foreground">Built from the catering rules: servings × price per serving, delivery, staffing and tax. Edits apply to this quote only{locked ? "." : ` — ${saveState === "saving" ? "saving…" : saveState === "error" ? "could not save edits" : "edits saved"}.`}</p></div>
          {!locked && (
            <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-secondary"><MapPin size={15} className="text-primary" />
              <input type="checkbox" checked={quote.sfOn} onChange={e => updateSf(e.target.checked)} className="h-4 w-4 accent-primary" /> SF delivery surcharge
              <span className="text-xs text-muted-foreground">{quote.sfDetected ? "(SF venue detected)" : "(not detected)"}</span>
            </label>
          )}
        </div>
        {quote.flags.length > 0 && !locked && (
          <ul className="mt-4 space-y-1 rounded-lg bg-accent p-4 text-sm text-accent-foreground">{quote.flags.map(f => <li key={f} className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{f}</li>)}</ul>
        )}
        <QuoteLinesTable quote={quote} locked={locked} onChange={updateOverrides} />
        {margin != null && flag && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Check against internal cost ({money(internalCost!)}): <span className={`rounded-full px-3 py-1 text-xs font-semibold margin-${flag}`}>{(margin * 100).toFixed(1)}% margin on the customer subtotal</span> <span className="text-xs">Owner-only — never shown to the customer.</span></p>
        )}
      </section>
      <QuoteWorkflow inquiryId={inquiryId} data={data} quote={quote} internalQuote={internalQuote} onChanged={status => { onStatus(status); reload(); }} />
    </>
  );
}
