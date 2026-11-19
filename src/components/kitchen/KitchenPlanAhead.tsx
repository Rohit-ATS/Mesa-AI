import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Layers, Sparkles, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { prepClass, prepLabel, prepState, todayLA } from "@/lib/prepStatus";

export type KitchenDish = { name_es: string; name_en: string; servings: number; batch_yield: number | null; recipe: { name: string; qty: number; unit: string }[] };
export type KitchenEvent = { id: string; event_date: string | null; event_time: string | null; venue_area: string | null; guest_count: number | null; dietary_flags: string[]; dietary_confirmed: boolean; dishes: KitchenDish[]; timeline: { dish: string; due_at: string }[]; checklist: Record<string, boolean> };

const safeText = (text: string) => text.replace(/\p{Sc}\s*[\d,.]*/gu, "");
const shortDate = (d: string) => format(new Date(`${d}T12:00:00`), "EEE MMM d");
function addDays(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

export function KitchenPlanAhead({ events, onOpen }: { events: KitchenEvent[]; onOpen: (id: string) => void }) {
  const [days, setDays] = useState<7 | 14>(7);
  const [ai, setAi] = useState<{ text: string; at: string; days: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = todayLA(); const end = addDays(today, days - 1);
  const upcoming = useMemo(() => events.filter(e => e.event_date && e.event_date >= today && e.event_date <= end).sort((a, b) => `${a.event_date}${a.event_time}`.localeCompare(`${b.event_date}${b.event_time}`)), [events, today, end]);

  const ingredients = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; total: number; uses: { date: string; qty: number }[] }>();
    for (const e of upcoming) for (const d of e.dishes) for (const r of d.recipe) {
      const key = `${r.name.toLowerCase()}|${r.unit}`;
      const cur = map.get(key) || { name: r.name, unit: r.unit, total: 0, uses: [] };
      cur.total += Number(r.qty);
      const existing = cur.uses.find(u => u.date === e.event_date);
      if (existing) existing.qty += Number(r.qty); else cur.uses.push({ date: e.event_date!, qty: Number(r.qty) });
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.uses.length - a.uses.length || a.name.localeCompare(b.name));
  }, [upcoming]);
  const dishes = useMemo(() => {
    const map = new Map<string, { name: string; servings: number; dates: Set<string> }>();
    for (const e of upcoming) for (const d of e.dishes) { const cur = map.get(d.name_es) || { name: d.name_es, servings: 0, dates: new Set<string>() }; cur.servings += d.servings; cur.dates.add(e.event_date!); map.set(d.name_es, cur); }
    return [...map.values()].sort((a, b) => b.dates.size - a.dates.size || b.servings - a.servings);
  }, [upcoming]);
  const shared = ingredients.filter(i => i.uses.length > 1);
  const guests = upcoming.reduce((s, e) => s + (e.guest_count || 0), 0);

  async function suggest() {
    setBusy(true); setError("");
    const { data, error: fnError } = await supabase.functions.invoke("mesa-kitchen-planner-3759b04e315c", { body: { days } });
    let msg = data?.message as string | undefined;
    if (fnError && "context" in fnError && fnError.context instanceof Response) msg = (await fnError.context.json().catch(() => null))?.message;
    if (fnError || !data?.suggestions) setError(msg || "Suggestions could not be generated. Please try again.");
    else setAi({ text: data.suggestions, at: data.generated_at, days });
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg text-muted-foreground">{upcoming.length} event{upcoming.length === 1 ? "" : "s"} · {guests} guests · {shortDate(today)} – {shortDate(end)}</p>
        <div role="tablist" aria-label="Planning window" className="flex rounded-full border border-border bg-card p-1">{([7, 14] as const).map(d => <button key={d} role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${days === d ? "bg-secondary text-secondary-foreground" : "text-secondary"}`}>Next {d} days</button>)}</div>
      </div>

      {!upcoming.length ? <p className="rounded-xl border border-border bg-card p-7 text-lg text-muted-foreground">No approved events in the next {days} days.</p> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(e => { const p = prepState(e.checklist); return (
          <button key={e.id} onClick={() => onOpen(e.id)} className="rounded-xl border border-border bg-card p-5 text-left transition hover:shadow-soft">
            <div className="flex items-center justify-between gap-2"><strong className="font-display text-xl text-secondary">{shortDate(e.event_date!)}</strong><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${prepClass[p]}`}>{prepLabel[p]}</span></div>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground"><UsersRound size={16} /> {e.event_time?.slice(0, 5) || "Time TBC"} · {e.guest_count ?? "?"} guests</p>
            <p className="mt-2 text-sm">{e.dishes.map(d => safeText(d.name_es)).join(" · ")}</p>
            {e.dietary_flags.length > 0 && <p className="mt-2 text-sm font-semibold text-destructive">Dietary: {e.dietary_flags.map(safeText).join(", ")}</p>}
          </button>
        ); })}</div>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-2xl text-secondary"><Sparkles size={20} className="text-primary" /> AI prep suggestions</h2>
            <button onClick={suggest} disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Thinking…" : ai ? "Refresh suggestions" : "Get suggestions"}</button>
          </div>
          {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
          {ai ? <><p className="mt-4 whitespace-pre-line leading-7">{ai.text}</p><p className="mt-4 text-xs text-muted-foreground">AI-generated for the next {ai.days} days at {new Date(ai.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Check quantities against the lists below.</p></>
            : !error && <p className="mt-3 text-muted-foreground">Get a suggested schedule and what to shop and prep together across these events.</p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl text-secondary"><Layers size={20} className="text-primary" /> Combined ingredients</h2>
          <p className="mt-1 text-sm text-muted-foreground">{shared.length ? `${shared.length} ingredient${shared.length === 1 ? " is" : "s are"} used on more than one day — candidates to buy and prep together.` : "No ingredients are shared across days in this window."}</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-4">Ingredient</th><th className="py-2 pr-4">Total</th><th className="py-2">By event day</th></tr></thead>
            <tbody>{ingredients.map(i => (
              <tr key={`${i.name}|${i.unit}`} className="border-t border-border">
                <td className="py-3 pr-4 font-semibold">{safeText(i.name)}{i.uses.length > 1 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">Shared ×{i.uses.length}</span>}</td>
                <td className="py-3 pr-4 font-bold text-primary">{Number(i.total.toFixed(2))} {safeText(i.unit)}</td>
                <td className="py-3 text-sm text-muted-foreground">{i.uses.map(u => `${shortDate(u.date)}: ${Number(u.qty.toFixed(2))}`).join(" · ")}</td>
              </tr>
            ))}</tbody>
          </table>{!ingredients.length && <p className="py-4 text-muted-foreground">Recipe quantities need confirmation.</p>}</div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl text-secondary">Dish totals</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">{dishes.map(d => <li key={d.name} className="flex justify-between gap-4 border-t border-border pt-3"><span className="font-semibold">{safeText(d.name)}{d.dates.size > 1 && <span className="ml-2 text-xs text-muted-foreground">{d.dates.size} days</span>}</span><strong className="text-primary">{d.servings} servings</strong></li>)}</ul>
        </section>
      </>}
    </div>
  );
}
