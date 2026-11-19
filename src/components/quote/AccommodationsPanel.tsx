import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accommodationCovered, type QuoteDish } from "@/lib/customerQuote";
import type { Accommodation, MenuOption } from "./useCustomerQuoteData";

type Props = { inquiryId: string; guests: number | null; dishes: QuoteDish[]; menu: MenuOption[]; accommodations: Accommodation[]; dietaryFlags: string[]; breakdownRecorded: boolean; unresolvedNotes: string[]; ownerNote: string | null; locked: boolean; onSaved: () => void };
const ALLERGY_WORDS = /(allerg|peanut|nut|shellfish|fish|gluten|wheat|celiac|dairy|lactose|milk|egg|soy|sesame)/i;

export function AccommodationsPanel({ inquiryId, guests, dishes, menu, accommodations, dietaryFlags, breakdownRecorded, unresolvedNotes, ownerNote, locked, onSaved }: Props) {
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"allergy" | "preference">("preference");
  const [label, setLabel] = useState("");
  const [count, setCount] = useState("");
  const [noneReason, setNoneReason] = useState("");
  const [busy, setBusy] = useState(false);
  const legacyNotes = dietaryFlags.filter(f => f && f.toLowerCase() !== "none");
  const allergies = accommodations.filter(a => a.kind === "allergy");
  const preferences = accommodations.filter(a => a.kind === "preference");

  function start(note: string) {
    setKind(ALLERGY_WORDS.test(note) ? "allergy" : "preference");
    setLabel(note.replace(/^(allergy|preference):\s*/i, "").replace(/\s*\(\d+ guests?\)$/i, "").slice(0, 80));
    setCount(""); setMessage("");
    window.setTimeout(() => document.getElementById("accommodation-count")?.focus(), 0);
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = label.trim(); const n = Number(count);
    if (!name || !Number.isInteger(n) || n < 1) { setMessage(`Enter a name and the number of ${kind === "allergy" ? "guests with this allergy" : "meals"} (a whole number).`); return; }
    if (guests != null && n > guests) { setMessage(`${n} is more than the ${guests} guests attending.`); return; }
    setBusy(true);
    const { error } = await supabase.from("mesa_accommodation").insert({ inquiry_id: inquiryId, kind, label: name, guest_count: n });
    setBusy(false);
    setMessage(error ? `Could not add: ${error.message}` : ""); if (!error) { setLabel(""); setCount(""); onSaved(); }
  }

  async function confirmNone() {
    const reason = noneReason.trim();
    if (reason.length < 3) { setMessage("Add a short reason, e.g. \"Customer confirmed by phone: no vegetarian meals needed\"."); return; }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("mesa_dietary_intake").insert({ inquiry_id: inquiryId, allergies_none: true, preferences_none: true, owner_note: reason.slice(0, 300), resolved_by: auth.user?.id ?? null, resolved_at: new Date().toISOString() });
    setBusy(false);
    setMessage(error ? `Could not save: ${error.message}` : ""); if (!error) { setNoneReason(""); onSaved(); }
  }

  const row = (a: Accommodation) => <AccommodationRow key={a.id} a={a} guests={guests} covered={accommodationCovered(a.label, dishes)} menu={menu} locked={locked} onSaved={onSaved} setMessage={setMessage} />;
  return (
    <section id="dietary" className="mt-8 scroll-mt-6 rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-2xl text-secondary">Allergies & preferences</h3>
      <p className="mt-1 text-sm text-muted-foreground">Allergies and preferences are tracked separately, each with its number of meals. Each one is checked against the chosen dishes' dietary tags; when the menu doesn't cover it, confirm an alternative dish — it becomes its own editable quote line. Allergies also get a kitchen cross-contact review.</p>
      {unresolvedNotes.length > 0 && !locked && (
        <div className="mt-4 rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle size={17} /> Resolve before sending</p>
          <p className="mt-1 text-secondary">The customer wrote "{unresolvedNotes.join(", ")}" before allergies and preferences were asked separately. Nothing has been guessed — confirm with the customer, then record each one with its number of meals.</p>
          <div className="mt-3 flex flex-wrap gap-2">{unresolvedNotes.map(note => <button key={note} type="button" onClick={() => start(note)} className="rounded-md border border-primary bg-card px-3 py-1.5 font-semibold text-primary">Start from "{note}"</button>)}</div>
          <div className="mt-4 border-t border-destructive/30 pt-3">
            <label className="block text-xs text-muted-foreground">Or confirm there are no allergies or preferences — reason (required)
              <input value={noneReason} maxLength={300} onChange={e => setNoneReason(e.target.value)} placeholder="e.g. Customer confirmed by phone: no vegetarian meals needed" className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
            <button type="button" disabled={busy} onClick={confirmNone} className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-secondary disabled:opacity-40">Confirm none</button>
          </div>
        </div>
      )}
      {!breakdownRecorded && unresolvedNotes.length === 0 && (
        <div className="mt-4 flex gap-3 rounded-lg border border-status-yellow bg-status-yellow/10 p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-status-yellow" />
          <div><p className="font-semibold text-secondary">Needs allergy/preference breakdown</p><p className="mt-1 text-muted-foreground">Recorded before allergies and preferences were asked separately. Original note: {legacyNotes.length ? `"${legacyNotes.join(", ")}"` : "none recorded"}.</p></div>
        </div>
      )}
      {ownerNote && <p className="mt-4 flex items-center gap-2 text-sm text-secondary"><CheckCircle2 size={16} className="text-status-green" />Owner confirmed no allergies or preferences: "{ownerNote}"</p>}
      {breakdownRecorded && !ownerNote && !accommodations.length && <p className="mt-4 flex items-center gap-2 text-sm text-secondary"><CheckCircle2 size={16} className="text-status-green" />Customer reported no allergies and no dietary preferences.</p>}
      {allergies.length > 0 && <><h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-destructive">Allergies</h4><div className="mt-2 space-y-3">{allergies.map(row)}</div></>}
      {preferences.length > 0 && <><h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-secondary">Preferences</h4><div className="mt-2 space-y-3">{preferences.map(row)}</div></>}
      {!locked && (
        <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4 text-sm">
          <label className="text-xs text-muted-foreground">Type<select value={kind} onChange={e => setKind(e.target.value as "allergy" | "preference")} className="mt-1 block rounded-md border border-input bg-background p-2 text-sm text-foreground"><option value="allergy">Allergy</option><option value="preference">Preference</option></select></label>
          <label className="text-xs text-muted-foreground">Name<input value={label} onChange={e => setLabel(e.target.value)} maxLength={80} placeholder={kind === "allergy" ? "e.g. Shellfish" : "e.g. Vegetarian"} className="mt-1 block rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground">{kind === "allergy" ? "Guests" : "Meals"}<input id="accommodation-count" value={count} onChange={e => setCount(e.target.value)} type="number" min="1" className="mt-1 block w-24 rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
          <button disabled={busy} className="rounded-md border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-40">Add</button>
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
          {a.label} · {a.guest_count} {a.kind === "preference" ? (a.guest_count === 1 ? "meal" : "meals") : (a.guest_count === 1 ? "guest" : "guests")}
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
