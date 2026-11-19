import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMesaLiveUpdates } from "@/hooks/useMesaLiveUpdates";
import type { Json } from "@/integrations/supabase/types";
import type { Overrides, QuoteAccommodation, QuoteDish, QuoteEstimates, QuoteEvent } from "@/lib/customerQuote";

export type MenuOption = { id: string; name_es: string; name_en: string | null; category: string; dietary_tags: string[]; price: number | null };
export type Accommodation = QuoteAccommodation & { cross_contact_reviewed: boolean };
export type QuoteVersion = { id: string; version: number; status: string; created_at: string; accepted_at: string | null; customer_email: string; email_status: string | null; email_error: string | null; subtotal: number; tax_amount: number | null; total: number };
export type Release = { released_at: string; email_status: string | null; email_error: string | null; customer_email: string | null; version_id: string; prep_start_at: string | null; prep_start_reason: string | null; prep_start_source: string | null; reminder_sent_at: string | null; reminder_email_status: string | null };
export type QuoteData = {
  status: string; customerEmail: string | null; dietaryFlags: string[]; breakdownRecorded: boolean; event: QuoteEvent;
  /** Real dietary notes with no allergy/preference breakdown and no owner confirmation — sending is blocked. */
  unresolvedNotes: string[]; ownerNote: string | null; estimates: QuoteEstimates; estimatedFields: string[];
  dishes: QuoteDish[]; menu: MenuOption[]; accommodations: Accommodation[]; settings: Record<string, number | null>;
  versions: QuoteVersion[]; release: Release | null;
};

export function useCustomerQuoteData(inquiryId: string) {
  const [data, setData] = useState<QuoteData | null>(null);
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [sfSurcharge, setSfSurcharge] = useState<boolean | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(r => r + 1), []);
  useMesaLiveUpdates(!!data, reload);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [inq, lines, menu, prices, accs, intake, versions, release, costs, draft, workup] = await Promise.all([
        supabase.from("inquiry").select("status,guest_count,service_style,venue_address,venue_zip,distance_mi,event_duration_hours,dietary_flags,customer(email)").eq("id", inquiryId).single(),
        supabase.from("order_line").select("menu_item_id,qty_servings,menu_item(name_es,name_en,category,dietary_tags)").eq("inquiry_id", inquiryId),
        supabase.from("menu_item").select("id,name_es,name_en,category,dietary_tags").eq("active", true).order("display_order"),
        supabase.from("mesa_menu_price").select("menu_item_id,price_per_serving"),
        supabase.from("mesa_accommodation").select("id,kind,label,guest_count,alt_menu_item_id,alt_servings,cross_contact_reviewed").eq("inquiry_id", inquiryId).order("created_at"),
        supabase.from("mesa_dietary_intake").select("inquiry_id,owner_note").eq("inquiry_id", inquiryId).maybeSingle(),
        supabase.from("mesa_quote_version").select("id,version,status,created_at,accepted_at,customer_email,email_status,email_error,subtotal,tax_amount,total").eq("inquiry_id", inquiryId).order("version", { ascending: false }),
        supabase.from("mesa_kitchen_release").select("released_at,email_status,email_error,customer_email,version_id,prep_start_at,prep_start_reason,prep_start_source,reminder_sent_at,reminder_email_status").eq("inquiry_id", inquiryId).maybeSingle(),
        supabase.from("cost_setting").select("key,value_numeric"),
        supabase.from("mesa_quote_draft").select("overrides,sf_surcharge").eq("inquiry_id", inquiryId).maybeSingle(),
        supabase.from("mesa_auto_proposal").select("estimated_fields").eq("inquiry_id", inquiryId).maybeSingle(),
      ]);
      if (!alive) return;
      const failed = [inq, lines, menu, prices, accs, intake, versions, release, costs, draft, workup].find(r => r.error);
      if (failed || !inq.data) { setError(failed?.error?.message || "Quote lines could not be loaded."); return; }
      const price = new Map((prices.data || []).map(p => [p.menu_item_id, p.price_per_serving == null ? null : Number(p.price_per_serving)]));
      const menuOptions: MenuOption[] = (menu.data || []).map(m => ({ ...m, price: price.get(m.id) ?? null }));
      const byId = new Map(menuOptions.map(m => [m.id, m]));
      const i = inq.data;
      const breakdownRecorded = !!intake.data || (accs.data || []).length > 0;
      const realNotes = (i.dietary_flags || []).filter(f => f.trim() && !["none", "no", "n/a", "na"].includes(f.trim().toLowerCase()));
      const estimatedFields = workup.data?.estimated_fields ?? [];
      const estimateOf = (prefix: string) => { const hit = estimatedFields.find(f => f.startsWith(prefix)); const n = hit ? Number(hit.match(/\(([\d.]+)/)?.[1]) : NaN; return Number.isFinite(n) ? n : null; };
      setData({
        unresolvedNotes: breakdownRecorded ? [] : realNotes, ownerNote: intake.data?.owner_note ?? null, estimatedFields,
        estimates: { distance_mi: estimateOf("distance"), event_duration_hours: estimateOf("event duration") },
        status: i.status, customerEmail: (i.customer as { email: string | null } | null)?.email ?? null, dietaryFlags: i.dietary_flags || [],
        breakdownRecorded,
        event: { guests: i.guest_count, service_style: i.service_style, venue_address: i.venue_address, venue_zip: i.venue_zip, distance_mi: i.distance_mi == null ? null : Number(i.distance_mi), event_duration_hours: i.event_duration_hours == null ? null : Number(i.event_duration_hours) },
        dishes: (lines.data || []).filter(l => l.menu_item).map(l => ({ menu_item_id: l.menu_item_id, name_es: l.menu_item!.name_es, name_en: l.menu_item!.name_en, category: l.menu_item!.category, dietary_tags: l.menu_item!.dietary_tags || [], qty_servings: Number(l.qty_servings), price_per_serving: price.get(l.menu_item_id) ?? null })),
        menu: menuOptions,
        accommodations: (accs.data || []).map(a => ({ id: a.id, kind: a.kind as "allergy" | "preference", label: a.label, guest_count: a.guest_count, alt_menu_item_id: a.alt_menu_item_id, alt_servings: a.alt_servings == null ? null : Number(a.alt_servings), alt_name: a.alt_menu_item_id ? byId.get(a.alt_menu_item_id)?.name_es ?? null : null, alt_price: a.alt_menu_item_id ? byId.get(a.alt_menu_item_id)?.price ?? null : null, cross_contact_reviewed: a.cross_contact_reviewed })),
        settings: Object.fromEntries((costs.data || []).map(c => [c.key, c.value_numeric == null ? null : Number(c.value_numeric)])),
        versions: (versions.data || []).map(v => ({ ...v, subtotal: Number(v.subtotal), total: Number(v.total), tax_amount: v.tax_amount == null ? null : Number(v.tax_amount) })),
        release: release.data,
      });
      setError("");
      if (!draftLoaded) {
        setOverrides((draft.data?.overrides as Overrides | null) ?? {});
        setSfSurcharge(draft.data?.sf_surcharge ?? null);
        setDraftLoaded(true);
      }
    }
    void load();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, revision]);

  // Persist per-quote edits shortly after the owner stops typing.
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const persist = useCallback((next: Overrides, sf: boolean | null) => {
    clearTimeout(pending.current);
    setSaveState("saving");
    pending.current = setTimeout(async () => {
      const { error: saveError } = await supabase.from("mesa_quote_draft").upsert({ inquiry_id: inquiryId, overrides: next as unknown as Json, sf_surcharge: sf, updated_at: new Date().toISOString() });
      setSaveState(saveError ? "error" : "saved");
    }, 500);
  }, [inquiryId]);
  useEffect(() => () => clearTimeout(pending.current), []);

  const updateOverrides = useCallback((change: (previous: Overrides) => Overrides) => {
    setOverrides(previous => { const next = change(previous); persist(next, sfSurcharge); return next; });
  }, [persist, sfSurcharge]);
  const updateSf = useCallback((value: boolean | null) => { setSfSurcharge(value); persist(overrides, value); }, [overrides, persist]);

  return { data, error, overrides, sfSurcharge, saveState, updateOverrides, updateSf, reload };
}
