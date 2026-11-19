import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import type { CustomerQuote, LineKind, Overrides, QuoteLine } from "@/lib/customerQuote";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const SECTIONS: { title: string; kinds: LineKind[]; hint?: string }[] = [
  { title: "Dishes", kinds: ["dish", "alternative"] },
  { title: "Drinks & dessert (optional)", kinds: ["optional"], hint: "Optional — remove any the customer doesn't want." },
  { title: "Delivery & service", kinds: ["delivery", "sf_surcharge", "staffing"] },
];
const numberOrNull = (raw: string) => (raw.trim() === "" || !Number.isFinite(Number(raw)) ? null : Number(raw));

export function QuoteLinesTable({ quote, locked, onChange }: { quote: CustomerQuote; locked: boolean; onChange: (change: (previous: Overrides) => Overrides) => void }) {
  const set = (key: string, patch: Overrides[string]) => onChange(previous => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  const reset = (key: string) => onChange(previous => { const next = { ...previous }; delete next[key]; return next; });
  const tax = quote.lines.find(l => l.kind === "tax")!;
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="p-4">Line</th><th className="p-4">Qty</th><th className="p-4">Unit price</th><th className="p-4 text-right">Amount</th><th className="p-4">Note</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
        </thead>
        {SECTIONS.map(section => {
          const rows = quote.lines.filter(l => section.kinds.includes(l.kind));
          if (!rows.length) return null;
          return (
            <tbody key={section.title}>
              <tr className="border-t border-border bg-muted/40"><th colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-secondary">{section.title}{section.hint && <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">{section.hint}</span>}</th></tr>
              {rows.map(line => <LineRow key={line.key} line={line} locked={locked} set={set} reset={reset} />)}
            </tbody>
          );
        })}
        <tbody>
          <tr className="border-t-2 border-border"><th colSpan={3} className="p-4 text-secondary">Subtotal</th><td className="p-4 text-right font-display text-xl text-secondary"><span key={quote.subtotal} className="quote-change">{money(quote.subtotal)}</span></td><td colSpan={2} /></tr>
          <tr className={`border-t border-border ${tax.removed ? "opacity-50" : ""}`}>
            <th className="p-4 font-semibold text-secondary">{tax.removed ? "Tax not applied on this quote" : tax.label}{!tax.removed && tax.hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{tax.hint}</span>}</th>
            <td className="p-4 text-muted-foreground">Rate %</td>
            <td className="p-4"><input aria-label="Tax rate percent" type="number" min="0" step="any" disabled={locked || tax.removed} value={tax.unit_price ?? ""} placeholder="Pending" onChange={e => set("tax", { unit_price: numberOrNull(e.target.value) })} className="w-24 rounded-md border border-input bg-background px-2 py-1.5 disabled:opacity-50" /></td>
            <td className="p-4 text-right font-semibold text-secondary">{tax.removed ? "—" : tax.amount == null ? "Pending" : money(tax.amount)}</td>
            <td className="p-4"><input aria-label="Tax note" maxLength={300} disabled={locked} value={tax.note} onChange={e => set("tax", { note: e.target.value })} className="w-full min-w-40 rounded-md border border-input bg-background px-2 py-1.5 disabled:opacity-50" /></td>
            <td className="p-4">{!locked && <RowActions removed={tax.removed} edited={tax.edited} onRemove={() => set("tax", { removed: !tax.removed })} onReset={() => reset("tax")} />}</td>
          </tr>
          <tr className="border-t border-border bg-accent/50"><th colSpan={3} className="p-4 text-secondary">{quote.taxPending ? "Total before tax" : "Total"}</th><td className="p-4 text-right font-display text-2xl text-secondary"><span key={quote.total} className="quote-change">{money(quote.total)}</span></td><td colSpan={2} className="p-4 text-xs text-muted-foreground">{quote.taxPending ? "Tax will be confirmed before the event." : ""}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function LineRow({ line, locked, set, reset }: { line: QuoteLine; locked: boolean; set: (key: string, patch: Overrides[string]) => void; reset: (key: string) => void }) {
  const disabled = locked || line.removed;
  return (
    <tr className={`border-t border-border align-top ${line.removed ? "opacity-50" : ""}`}>
      <th className="p-4 font-semibold text-secondary">
        <span className={line.removed ? "line-through" : ""}>{line.label}</span>
        {line.kind === "alternative" && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">Alternative</span>}
        {line.issue && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle size={13} />{line.issue}{line.hint ? ` — ${line.hint}` : ""}</span>}
        {!line.issue && line.hint && !line.removed && <span className="mt-1 block text-xs font-normal text-muted-foreground">{line.hint}</span>}
      </th>
      <td className="p-4"><input aria-label={`Quantity for ${line.label}`} type="number" min="0" step="any" disabled={disabled} value={line.qty ?? ""} onChange={e => set(line.key, { qty: numberOrNull(e.target.value) })} className="w-20 rounded-md border border-input bg-background px-2 py-1.5 disabled:opacity-50" /><span className="mt-1 block text-xs text-muted-foreground">{line.unit}</span></td>
      <td className="p-4"><input aria-label={`Unit price for ${line.label}`} type="number" min="0" step="any" disabled={disabled} value={line.unit_price ?? ""} placeholder="Price needed" onChange={e => set(line.key, { unit_price: numberOrNull(e.target.value) })} className="w-28 rounded-md border border-input bg-background px-2 py-1.5 disabled:opacity-50" /></td>
      <td className="p-4 text-right font-semibold text-secondary">{line.removed ? "Removed" : line.amount == null ? "—" : money(line.amount)}</td>
      <td className="p-4"><input aria-label={`Note for ${line.label}`} maxLength={300} disabled={locked} value={line.note} placeholder="Optional note" onChange={e => set(line.key, { note: e.target.value })} className="w-full min-w-40 rounded-md border border-input bg-background px-2 py-1.5 disabled:opacity-50" /></td>
      <td className="p-4">{!locked && line.kind !== "alternative" && <RowActions removed={line.removed} edited={line.edited} onRemove={() => set(line.key, { removed: !line.removed })} onReset={() => reset(line.key)} />}</td>
    </tr>
  );
}

function RowActions({ removed, edited, onRemove, onReset }: { removed: boolean; edited: boolean; onRemove: () => void; onReset: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">{removed ? <><RotateCcw size={13} />Restore</> : <><Trash2 size={13} />Remove</>}</button>
      {edited && !removed && <button type="button" onClick={onReset} className="text-xs font-semibold text-primary">Reset</button>}
    </div>
  );
}
