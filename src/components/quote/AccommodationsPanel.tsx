import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accommodationCovered, type QuoteDish } from "@/lib/customerQuote";
import type { Accommodation, MenuOption } from "./useCustomerQuoteData";

type Props = { inquiryId: string; guests: number | null; dishes: QuoteDish[]; menu: MenuOption[]; accommodations: Accommodation[]; dietaryFlags: string[]; breakdownRecorded: boolean; locked: boolean; onSaved: () => void };

export function AccommodationsPanel({ inquiryId, guests, dishes, menu, accommodations, dietaryFlags, breakdownRecorded, locked, onSaved }: Props) {
  const [message, setMessage] = useState("");
  const legacyNotes = dietaryFlags.filter(f => f && f.toLowerCase() !== "none");

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const element = event.currentTarget;
    const label = String(form.get("label") || "").trim(); const count = Number(form.get("guests"));
    if (!label || !Number.isInteger(count) || count < 1) { setMessage("Enter a name and a whole-number guest count."); return; }
    if (guests != null && count > guests) { setMessage(`${count} guests is more than the ${guests} attending.`); return; }
    const { error } = await supabase.from("mesa_accommodation").insert({ inquiry_id: inquiryId, kind: String(form.get("kind")), label, guest_count: count });
    setMessage(error ? `Could not add: ${error.message}` : ""); if (!error) { element.reset(); onSaved(); }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-2xl text-secondary">Allergies & preferences</h3>
      <p className="mt-1 text-sm text-muted-foreground">Each one is checked against the chosen dishes' dietary tags. When the menu doesn't cover it, confirm an alternative meal — it becomes its own quote line. Allergies are flagged for a kitchen cross-contact review.</p>
      {!breakdownRecorded && (
        <div className="mt-4 flex gap-3 rounded-lg border border-status-yellow bg-status-yellow/10 p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-status-yellow" />
          <div><p className="font-semibold text-secondary">Needs allergy/preference breakdown</p><p className="mt-1 text-muted-foreground">Recorded before allergies and preferences were asked separately. Original note: {legacyNotes.length ? `"${legacyNotes.join(", ")}"` : "none recorded"}. Confirm with the customer and add each one below — nothing has been guessed.</p></div>
        </div>
      )}
      {breakdownRecorded && !accommodations.length && <p className="mt-4 flex items-center gap-2 text-sm text-secondary"><CheckCircle2 size={16} className="text-status-green" />Customer reported no allergies and no dietary preferences.</p>}
      <div className="mt-4 space-y-3">
        {accommodations.map(a => <AccommodationRow key={a.id} a={a} guests={guests} covered={accommodationCovered(a.label, dishes)} menu={menu} locked={locked} onSaved={onSaved} setMessage={setMessage} />)}
      </div>
      {!locked && (
        <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4 text-sm">
          <label className="text-xs text-muted-foreground">Type<select name="kind" className="mt-1 block rounded-md border border-input bg-background p-2 text-sm text-foreground"><option value="allergy">Allergy</option><option value="preference">Preference</option></select></label>
          <label className="text-xs text-muted-foreground">Name<input name="label" maxLength={80} placeholder="e.g. Shellfish" className="mt-1 block rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground">Guests<input name="guests" type="number" min="1" className="mt-1 block w-24 rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
          <button className="rounded-md border border-primary px-4 py-2 font-semibold text-primary">Add</button>
        </form>
      )}
      {message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}
    </section>
  );
}

function AccommodationRow({ a, guests, covered, menu, locked, onSaved, setMessage }: { a: Accommodation; guests: number | null; covered: boolean; menu: MenuOption[]; locked: boolean; onSaved: () => void; setMessage: (m: string) => void }) {
  const [dish, setDish] = useState(a.alt_menu_item_id ?? "");
  const [servings, setServings] = useState(String(a.alt_servings ?? a.guest_count));
  const [busy, setBusy] = useState(false);
  const confirmed = !!a.alt_menu_item_id && !!a.alt_servings;
  const over = guests != null && a.guest_count > guests;

  async function save(clear: boolean) {
    const qty = Number(servings);
    if (!clear && (!dish || !Number.isFinite(qty) || qty <= 0)) { setMessage("Choose an alternative dish and the number of servings."); return; }
    setBusy(true);
    const { error } = await supabase.from("mesa_accommodation").update(clear ? { alt_menu_item_id: null, alt_servings: null, alt_confirmed_at: null } : { alt_menu_item_id: dish, alt_servings: qty, alt_confirmed_at: new Date().toISOString() }).eq("id", a.id);
    setBusy(false); setMessage(error ? `Could not save: ${error.message}` : ""); if (!error) onSaved();
  }
  async function remove() {
    if (!window.confirm(`Remove ${a.kind} "${a.label}"?`)) return;
    const { error } = await supabase.from("mesa_accommodation").delete().eq("id", a.id);
    setMessage(error ? `Could not remove: ${error.message}` : ""); if (!error) onSaved();
  }

  return (
    <div className={`rounded-lg border p-4 ${a.kind === "allergy" ? "border-destructive/40" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-secondary">
          {a.kind === "allergy" && <ShieldAlert size={17} className="text-destructive" />}
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{a.kind}</span>
          {a.label} · {a.guest_count} {a.guest_count === 1 ? "guest" : "guests"}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {a.kind === "allergy" && <span className="rounded-full bg-destructive/10 px-2 py-1 font-bold uppercase tracking-wider text-destructive">Cross-contact review</span>}
          {covered ? <span className="font-semibold text-status-green">Covered by chosen dishes</span> : confirmed ? <span className="font-semibold text-status-green">Alternative confirmed</span> : <span className="font-semibold text-destructive">Alternative needed</span>}
          {!locked && <button type="button" onClick={remove} aria-label={`Remove ${a.label}`} className="text-destructive"><Trash2 size={14} /></button>}
        </div>
      </div>
      {over && <p className="mt-2 text-sm font-semibold text-destructive">{a.guest_count} guests is more than the {guests} attending — correct this before sending.</p>}
      {!covered && (
        confirmed && locked ? <p className="mt-2 text-sm text-muted-foreground">Alternative: {a.alt_name} · {a.alt_servings} servings</p> :
        !locked && <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
          <label className="text-xs text-muted-foreground">Confirmed alternative dish
            <select value={dish} onChange={e => setDish(e.target.value)} className="mt-1 block rounded-md border border-input bg-background p-2 text-sm text-foreground">
              <option value="">Choose a dish…</option>
              {menu.map(m => <option key={m.id} value={m.id}>{m.name_es}{m.dietary_tags.length ? ` — ${m.dietary_tags.join(", ").replaceAll("_", " ")}` : ""}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Servings<input type="number" min="1" step="any" value={servings} onChange={e => setServings(e.target.value)} className="mt-1 block w-24 rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
          <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-40">{confirmed ? "Update alternative" : "Confirm alternative"}</button>
          {confirmed && <button type="button" disabled={busy} onClick={() => save(true)} className="text-xs font-semibold text-muted-foreground">Clear</button>}
        </div>
      )}
      {!covered && a.kind === "allergy" && <p className="mt-2 text-xs text-muted-foreground">Check the alternative's ingredients against this allergy before confirming — dietary tags don't list allergens.</p>}
    </div>
  );
}
