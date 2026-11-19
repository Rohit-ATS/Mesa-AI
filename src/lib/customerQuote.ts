// Customer-facing quote lines built from La Bandera's catering rules.
// Pure function: the caller supplies records, nothing is read or written here.
// Keep in sync with supabase/functions/mesa-auto-proposal-3759b04e315c/customerQuote.ts.

export const MIN_GUESTS = 10;
export type LineKind = "dish" | "optional" | "alternative" | "delivery" | "sf_surcharge" | "staffing" | "tax";
export type QuoteDish = { menu_item_id: string; name_es: string; name_en: string | null; category: string; qty_servings: number; price_per_serving: number | null; dietary_tags: string[] };
export type QuoteAccommodation = { id: string; kind: "allergy" | "preference"; label: string; guest_count: number; alt_menu_item_id: string | null; alt_servings: number | null; alt_name: string | null; alt_price: number | null };
export type QuoteEvent = { guests: number | null; service_style: string | null; venue_address: string | null; venue_zip: string | null; distance_mi: number | null; event_duration_hours: number | null };
/** Values the automatic workup estimated because the customer didn't provide them. Always shown as demo estimates. */
export type QuoteEstimates = { distance_mi?: number | null; event_duration_hours?: number | null };
export const DEMO_ESTIMATE = "Demo estimate — confirm with customer";
export type LineOverride = { qty?: number | null; unit_price?: number | null; note?: string; removed?: boolean };
export type Overrides = Record<string, LineOverride>;
export type QuoteLine = {
  key: string; kind: LineKind; label: string; qty: number | null; unit: string; unit_price: number | null; note: string; hint: string;
  menu_item_id?: string; accommodation_id?: string; removed: boolean; edited: boolean; amount: number | null; issue: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const OPTIONAL = new Set(["dessert", "beverage"]);
const COVERAGE: Record<string, string[]> = {
  vegetarian: ["vegetarian", "vegan"], vegan: ["vegan"], pescatarian: ["pescatarian", "vegetarian", "vegan"],
  "gluten/wheat": ["gluten_free"], "gluten-free": ["gluten_free"],
};

/** True when a chosen entrée (or any chosen dish if there is no entrée) carries a matching dietary tag. */
export function accommodationCovered(label: string, dishes: Pick<QuoteDish, "category" | "dietary_tags">[]) {
  const tags = COVERAGE[label.trim().toLowerCase()];
  if (!tags) return false;
  const entrees = dishes.filter(d => d.category === "entree");
  return (entrees.length ? entrees : dishes).some(d => d.dietary_tags.some(t => tags.includes(t)));
}

export function detectSanFrancisco(address: string | null, zip: string | null) {
  const text = `${address ?? ""} ${zip ?? ""}`;
  return /san\s+francisco/i.test(text) || /\b941\d{2}\b/.test(text) || /,\s*SF\b/.test(text);
}

export function buildCustomerQuote(input: {
  event: QuoteEvent; dishes: QuoteDish[]; accommodations: QuoteAccommodation[]; settings: Record<string, number | null>; sfSurcharge: boolean | null; overrides: Overrides;
  estimates?: QuoteEstimates; dietaryUnresolved?: string[];
}) {
  const { dishes, accommodations, settings, overrides } = input;
  const estDistance = input.event.distance_mi == null && input.estimates?.distance_mi != null;
  const estDuration = input.event.event_duration_hours == null && input.estimates?.event_duration_hours != null;
  const event = { ...input.event, distance_mi: estDistance ? input.estimates!.distance_mi! : input.event.distance_mi, event_duration_hours: estDuration ? input.estimates!.event_duration_hours! : input.event.event_duration_hours };
  const s = (key: string) => { const v = settings[key]; return v == null || !Number.isFinite(Number(v)) ? null : Number(v); };
  const guests = event.guests;
  const base: Omit<QuoteLine, "removed" | "edited" | "amount" | "issue" | "note">[] = [];

  for (const d of dishes) base.push({
    key: `dish:${d.menu_item_id}`, kind: OPTIONAL.has(d.category) ? "optional" : "dish",
    label: d.name_en ? `${d.name_es} (${d.name_en})` : d.name_es, qty: d.qty_servings, unit: "servings", unit_price: d.price_per_serving,
    hint: d.price_per_serving == null ? "Set a price per serving on the Menu page" : "", menu_item_id: d.menu_item_id,
  });

  for (const a of accommodations) {
    if (accommodationCovered(a.label, dishes) || !a.alt_menu_item_id) continue;
    base.push({
      key: `alt:${a.id}`, kind: "alternative", label: `Alternative meal for ${a.label} (${a.guest_count} guests) — ${a.alt_name ?? "Dish"}`,
      qty: a.alt_servings, unit: "servings", unit_price: a.alt_price, hint: a.alt_price == null ? "Set a price per serving on the Menu page" : "",
      menu_item_id: a.alt_menu_item_id, accommodation_id: a.id,
    });
  }

  const perVehicle = s("guests_per_vehicle"); const fee = s("transport_base_fee"); const perMile = s("transport_per_mile");
  const vehicles = guests && perVehicle ? Math.max(1, Math.ceil(guests / perVehicle)) : 1;
  const trip = fee != null && perMile != null && event.distance_mi != null ? round2(fee + event.distance_mi * 2 * perMile) : null;
  base.push({
    key: "delivery", kind: "delivery", label: `Delivery — base fee + mileage${event.distance_mi != null ? ` (${event.distance_mi} mi each way, round trip)` : ""}`,
    qty: vehicles, unit: vehicles === 1 ? "vehicle" : "vehicles", unit_price: trip, hint: event.distance_mi == null ? "Distance to venue needed for mileage" : estDistance ? `${DEMO_ESTIMATE} (distance)` : "",
  });

  const sfDetected = detectSanFrancisco(event.venue_address, event.venue_zip);
  const sfOn = input.sfSurcharge ?? sfDetected;
  if (sfOn) base.push({ key: "sf_surcharge", kind: "sf_surcharge", label: "San Francisco delivery surcharge", qty: 1, unit: "flat fee", unit_price: s("sf_delivery_surcharge"), hint: s("sf_delivery_surcharge") == null ? "Set the SF surcharge in Settings" : "" });

  if (event.service_style === "setup" || event.service_style === "full_service") {
    const perStaff = s("guests_per_service_staff"); const setup = s("setup_teardown_hours") ?? 0;
    const staff = guests && perStaff ? Math.max(1, Math.ceil(guests / perStaff)) : null;
    const hours = event.service_style === "full_service" ? (event.event_duration_hours == null ? null : event.event_duration_hours + setup) : setup;
    base.push({
      key: "staffing", kind: "staffing", label: `Service staff${staff != null && hours != null ? ` — ${staff} staff × ${hours} h` : ""}`,
      qty: staff != null && hours != null ? round2(staff * hours) : null, unit: "staff hours", unit_price: s("staff_charge_hourly"),
      hint: hours == null ? "Event length needed for staffing hours" : estDuration && event.service_style === "full_service" ? `${DEMO_ESTIMATE} (event length)` : "",
    });
  }

  const lines: QuoteLine[] = base.map(line => {
    const o = overrides[line.key] ?? {};
    const qty = "qty" in o ? o.qty ?? null : line.qty;
    const unit_price = "unit_price" in o ? o.unit_price ?? null : line.unit_price;
    const removed = !!o.removed;
    const amount = qty != null && unit_price != null ? round2(qty * unit_price) : null;
    const issue = removed ? null : unit_price == null ? "Price needed" : qty == null || qty <= 0 ? "Quantity needed" : null;
    return { ...line, qty, unit_price, note: o.note ?? "", removed, edited: "qty" in o || "unit_price" in o, amount, issue };
  });

  const active = lines.filter(l => !l.removed);
  const subtotal = round2(active.reduce((sum, l) => sum + (l.amount ?? 0), 0));
  const taxOverride = overrides.tax ?? {};
  const rate = "unit_price" in taxOverride ? taxOverride.unit_price ?? null : s("sales_tax_rate_pct");
  const taxRemoved = !!taxOverride.removed;
  const taxAmount = rate == null ? null : round2(subtotal * rate / 100);
  const tax: QuoteLine = {
    key: "tax", kind: "tax", label: rate == null ? "Tax: pending — will be confirmed before your event" : `Sales tax (${rate}%)`, qty: null, unit: "%",
    unit_price: rate, note: taxOverride.note ?? "", hint: rate == null ? "Set a tax rate in Settings or enter one for this quote" : "",
    removed: taxRemoved, edited: "unit_price" in taxOverride, amount: taxAmount, issue: null,
  };

  const blocking: string[] = [];
  for (const note of input.dietaryUnresolved ?? []) blocking.push(`Resolve before sending: dietary note "${note}" — record each allergy or preference with its number of meals, or confirm there are none.`);
  if (guests == null || guests < MIN_GUESTS) blocking.push(`La Bandera Kitchen caters a minimum of ${MIN_GUESTS} guests${guests != null ? ` — this event has ${guests}` : ""}.`);
  if (!active.some(l => l.kind === "dish")) blocking.push("Add at least one dish line.");
  for (const l of active) if (l.issue) blocking.push(`${l.issue}: ${l.label}`);
  for (const a of accommodations) {
    if (guests != null && a.guest_count > guests) blocking.push(`${a.label}: ${a.guest_count} guests is more than the ${guests} attending.`);
    if (!accommodationCovered(a.label, dishes) && (!a.alt_menu_item_id || !a.alt_servings)) blocking.push(`Confirm an alternative meal for ${a.kind} "${a.label}" (${a.guest_count} guests).`);
  }
  const flags = [...blocking];
  if (estDistance) flags.push(`Distance ${event.distance_mi} mi is a ${DEMO_ESTIMATE.toLowerCase()}.`);
  if (estDuration) flags.push(`Event length ${event.event_duration_hours} h is a ${DEMO_ESTIMATE.toLowerCase()}.`);
  if (!taxRemoved && rate == null) flags.push("Tax pending — totals are before tax.");
  if (sfDetected) flags.push(sfOn ? "San Francisco venue detected — surcharge added." : "San Francisco venue detected — surcharge switched off.");

  const taxPending = !taxRemoved && rate == null;
  return { lines: [...lines, tax], subtotal, taxAmount: taxRemoved ? null : taxAmount, taxPending, taxRemoved, total: round2(subtotal + (taxRemoved ? 0 : taxAmount ?? 0)), sfDetected, sfOn, blocking, flags };
}

export type CustomerQuote = ReturnType<typeof buildCustomerQuote>;

/** When confirmed alternatives push total main-dish servings above the guest count, suggest reducing the main dish. Never applied automatically. */
export function alternativeSuggestions(quote: CustomerQuote, guests: number | null) {
  if (guests == null) return [];
  const active = quote.lines.filter(l => !l.removed);
  const alternatives = active.filter(l => l.kind === "alternative" && l.qty != null);
  const altServings = alternatives.reduce((sum, l) => sum + (l.qty ?? 0), 0);
  const mains = active.filter(l => l.kind === "dish" && l.qty != null);
  if (!alternatives.length || !mains.length) return [];
  const main = [...mains].sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0))[0];
  const target = Math.max(1, Math.round(((main.qty ?? 0) - altServings) * 100) / 100);
  if ((main.qty ?? 0) + altServings <= guests || target === main.qty) return [];
  return [{ key: main.key, label: main.label, from: main.qty ?? 0, to: target, altServings }];
}

/** Lines in the shape the approve-quote action expects. */
export function linesForApproval(quote: CustomerQuote) {
  return quote.lines.filter(l => !l.removed).map(l => ({
    key: l.key, kind: l.kind, label: l.label, qty: l.qty, unit: l.unit, unit_price: l.unit_price, amount: l.kind === "tax" ? l.amount : undefined,
    note: l.note.trim() || null, menu_item_id: l.menu_item_id ?? null, accommodation_id: l.accommodation_id ?? null,
  }));
}
