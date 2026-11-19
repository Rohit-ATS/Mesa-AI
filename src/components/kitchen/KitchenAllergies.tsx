import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { KitchenAccommodation, KitchenEvent } from "./KitchenPlanAhead";

// Free-text operational labels must not render currency symbols or amounts.
const safeText = (text: string) => text.replace(/\p{Sc}\s*[\d,.]*/gu, "");

function Meal({ a }: { a: KitchenAccommodation }) {
  if (a.alternative) return <span>Alternative meal: <strong>{safeText(a.alternative)}</strong>{a.alternative_servings ? ` · ${a.alternative_servings} servings` : ""}</span>;
  return <span>{a.covered_by_menu ? "Covered by the menu's dishes" : "No alternative recorded — confirm with the owner"}</span>;
}

/** Allergies (with cross-contact review) and preferences for one released order. */
export function KitchenAllergies({ event, onReviewed }: { event: KitchenEvent; onReviewed: (id: string, done: boolean) => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const allergies = event.allergies ?? []; const preferences = event.preferences ?? [];
  const legacy = !event.breakdown_recorded && event.dietary_flags.some(f => f && f.toLowerCase() !== "none");

  async function toggle(id: string, done: boolean) {
    if (saving) return;
    setSaving(id); setError("");
    const { error: saveError } = await supabase.rpc("mesa_kitchen_cross_contact", { p_accommodation: id, p_done: done });
    setSaving(null);
    if (saveError) setError("Could not save the cross-contact review. Please try again."); else onReviewed(id, done);
  }

  return (
    <section className="mt-10 rounded-xl border-2 border-destructive bg-card p-7">
      <h2 className="flex items-center gap-3 font-display text-3xl text-secondary"><ShieldAlert className="text-destructive" /> Allergies & preferences</h2>
      {legacy && <p className="mt-4 flex items-start gap-2 text-lg font-semibold text-destructive"><AlertTriangle className="mt-1 shrink-0" size={20} /> Needs allergy/preference breakdown — original note: {event.dietary_flags.map(safeText).join(", ")}. Confirm with the owner.</p>}
      {!legacy && !allergies.length && !preferences.length && <p className="mt-4 text-lg text-muted-foreground">No allergies or preferences recorded.</p>}
      {allergies.length > 0 && <div className="mt-6 space-y-4">
        {allergies.map(a => (
          <label key={a.id} className="flex items-start gap-4 rounded-lg bg-destructive/10 p-5 text-lg">
            <input type="checkbox" checked={a.reviewed} disabled={saving !== null} onChange={e => toggle(a.id, e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-primary" />
            <span>
              <span className="block font-bold uppercase tracking-wide text-destructive">Allergy · {safeText(a.label)} · {a.guests} guests — Cross-contact review</span>
              <span className="mt-1 block text-secondary"><Meal a={a} /></span>
              <span className="mt-1 block text-base text-muted-foreground">Tick once separate prep, utensils and labelling are confirmed. Required before the order can be marked prepared.</span>
            </span>
          </label>
        ))}
      </div>}
      {preferences.length > 0 && <ul className="mt-6 space-y-2 border-t border-border pt-5 text-lg">
        {preferences.map(p => <li key={p.id}><strong className="text-secondary">Preference · {safeText(p.label)} · {p.guests} guests</strong> — <Meal a={p} /></li>)}
      </ul>}
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    </section>
  );
}
