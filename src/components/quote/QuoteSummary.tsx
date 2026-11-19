import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerQuote } from "@/lib/customerQuote";
import type { QuoteData } from "./useCustomerQuoteData";

type Internal = { version: number; status: string; food_cost: number | null; labor_cost: number | null; overhead_cost: number | null; transport_cost: number | null; packaging_cost: number | null; total_cost: number | null; recommended_price: number | null; margin_pct: number | null; price_per_guest: number | null; competitor_low: number | null; competitor_high: number | null; competitor_percentile: number | null; assumptions_json: unknown };
type Header = { customer: string; email: string | null; date: string | null; time: string | null; address: string | null };
const usd = (v: number | null | undefined) => v == null || !Number.isFinite(Number(v)) ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
const DEMO = "Demo value — not actual LBK pricing";

/** Owner-only full quote: customer draft, itemised lines, tax status, internal build-up, competitor band and every open flag. Downloadable as text. */
export function QuoteSummary({ inquiryId, data, quote }: { inquiryId: string; data: QuoteData; quote: CustomerQuote }) {
  const [internal, setInternal] = useState<Internal | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [header, setHeader] = useState<Header | null>(null);
  const [depositPct, setDepositPct] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      supabase.from("quote").select("version,status,food_cost,labor_cost,overhead_cost,transport_cost,packaging_cost,total_cost,recommended_price,margin_pct,price_per_guest,competitor_low,competitor_high,competitor_percentile,assumptions_json").eq("inquiry_id", inquiryId).order("version", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("mesa_auto_proposal").select("proposal_draft").eq("inquiry_id", inquiryId).maybeSingle(),
      supabase.from("inquiry").select("event_date,event_time,venue_address,customer(name,email)").eq("id", inquiryId).single(),
    ]).then(([q, ap, inq]) => {
      if (!alive) return;
      setInternal(q.data as Internal | null); setDraft(ap.data?.proposal_draft ?? null);
      const c = inq.data?.customer as { name: string; email: string | null } | null;
      setHeader(inq.data ? { customer: c?.name ?? "Customer", email: c?.email ?? null, date: inq.data.event_date, time: inq.data.event_time, address: inq.data.venue_address } : null);
    });
    setDepositPct(data.settings.deposit_pct ?? null);
    return () => { alive = false; };
  }, [inquiryId, data.settings.deposit_pct]);

  const text = useMemo(() => {
    const out: string[] = [];
    const ev = data.event;
    out.push("LA BANDERA KITCHEN — FULL QUOTE SUMMARY (OWNER ONLY)", `All costs, rates and benchmarks: ${DEMO}.`, "");
    out.push(`Customer: ${header?.customer ?? "—"}${header?.email ? ` <${header.email}>` : ""}`);
    out.push(`Event: ${header?.date ?? "date not set"} ${header?.time?.slice(0, 5) ?? ""} · ${ev.guests ?? "?"} guests · ${(ev.service_style ?? "service not set").replace("_", " ")}`);
    out.push(`Venue: ${header?.address ?? "not set"}`);
    out.push(`Stage: ${data.release ? "Released to kitchen" : data.versions[0] ? `Quote v${data.versions[0].version} ${data.versions[0].status}` : "Not approved — nothing sent to the customer"}`, "");
    out.push("ALLERGIES & PREFERENCES");
    if (data.unresolvedNotes.length) out.push(`  UNRESOLVED dietary note: "${data.unresolvedNotes.join(", ")}" — no meal count or alternative yet`);
    for (const a of data.accommodations) out.push(`  ${a.kind === "allergy" ? "Allergy (cross-contact review)" : "Preference"}: ${a.label} — ${a.guest_count} ${a.kind === "allergy" ? "guests" : "meals"}${a.alt_name ? ` · alternative ${a.alt_name} × ${a.alt_servings}` : ""}`);
    if (data.ownerNote) out.push(`  Owner confirmed none: ${data.ownerNote}`);
    if (!data.unresolvedNotes.length && !data.accommodations.length && !data.ownerNote) out.push("  None recorded");
    out.push("", "CUSTOMER QUOTE (itemised)");
    for (const l of quote.lines) {
      if (l.kind === "tax") continue;
      out.push(`  ${l.removed ? "[removed] " : ""}${l.label}${l.kind === "optional" ? " (optional)" : ""} — ${l.qty ?? "?"} ${l.unit} × ${l.unit_price == null ? "Price needed" : usd(l.unit_price)} = ${l.amount == null ? "—" : usd(l.amount)}${l.hint ? ` [${l.hint}]` : ""}${l.note ? ` · note: ${l.note}` : ""}`);
    }
    out.push(`  Subtotal: ${usd(quote.subtotal)}`);
    out.push(`  Tax: ${quote.taxRemoved ? "not applied" : quote.taxPending ? "pending — will be confirmed before your event" : usd(quote.taxAmount)}`);
    out.push(`  ${quote.taxPending ? "Total before tax" : "Total"}: ${usd(quote.total)}${quote.lines.some(l => !l.removed && l.issue) ? " (incomplete — some lines need a price or quantity)" : ""}`);
    if (depositPct != null) out.push(`  Deposit (${Math.round(depositPct * 100)}%, ${DEMO.toLowerCase()}): ${usd(quote.total * depositPct)}`);
    out.push("", `INTERNAL COST CHECK (owner only · ${DEMO})`);
    if (internal) {
      out.push(`  Food ${usd(internal.food_cost)} · Labor ${usd(internal.labor_cost)} · Overhead ${usd(internal.overhead_cost)} · Transport ${usd(internal.transport_cost)} · Packaging ${usd(internal.packaging_cost)}`);
      out.push(`  Total cost ${usd(internal.total_cost)} · Suggested price ${usd(internal.recommended_price)} (${usd(internal.price_per_guest)}/guest) · Margin ${internal.margin_pct == null ? "—" : `${(internal.margin_pct * 100).toFixed(1)}%`}`);
      out.push(`  Competitor band ${usd(internal.competitor_low)}–${usd(internal.competitor_high)} per guest${internal.competitor_percentile != null ? ` · ${internal.competitor_percentile}th percentile` : ""}`);
      const assumptions = (internal.assumptions_json as { assumptions?: Record<string, string> } | null)?.assumptions;
      if (assumptions) for (const [k, v] of Object.entries(assumptions)) out.push(`  - ${k}: ${v}`);
    } else out.push("  No internal cost calculation saved yet.");
    if (data.estimatedFields.length) out.push(`  Demo estimates used: ${data.estimatedFields.join("; ")}`);
    out.push("", "OPEN FLAGS");
    if (quote.flags.length) for (const f of quote.flags) out.push(`  - ${f}`); else out.push("  None");
    out.push("", "CUSTOMER-FACING DRAFT (AI, not sent)", draft ? draft.split("\n").map(l => `  ${l}`).join("\n") : "  No draft generated.");
    return out.join("\n");
  }, [data, quote, internal, draft, header, depositPct]);

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `quote-summary-${(header?.customer ?? "inquiry").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <details className="mt-8 rounded-xl border border-border bg-card p-6">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 font-display text-2xl text-secondary"><span className="flex items-center gap-2"><FileText size={20} /> Full quote summary</span><span className="text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground">Owner only</span></summary>
      <p className="mt-3 text-sm text-muted-foreground">Everything for this inquiry in one place — the customer draft, every itemised line, tax status, internal costs and open flags. Costs, rates and benchmarks are demo values, not actual LBK pricing.</p>
      <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-background p-4 text-xs leading-5 text-foreground">{text}</pre>
      <button type="button" onClick={download} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-secondary"><Download size={16} /> Download summary</button>
    </details>
  );
}
