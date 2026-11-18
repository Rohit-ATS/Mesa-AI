// The caller supplies database records; this function performs no I/O or mutation.
// ingredient.waste_pct is stored as percentage points (10 means 10%), while
// cost_setting ratios (including waste_pct_default) are stored as fractions.
const MINUTES_PER_HOUR = 60;
const PERCENT_SCALE = 100;
const ROUND_TRIP_LEGS = 2;
const MIN_STAFF_OR_VEHICLES = 1;

export type QuoteInquiry = { guest_count: number; service_style: "dropoff" | "setup" | "full_service"; distance_mi: number; event_duration_hours: number };
export type QuoteOrderLine = { menu_item_id: string; qty_servings: number; recipe_lines: { qty_per_serving: number; unit: string; ingredient: { unit: string; unit_cost_usd: number; waste_pct: number | null } }[] };
export type CostSetting = { key: string; value_numeric: number | null };
export type CompetitorBenchmark = { business_name: string; researched_on: string; min_guests: number | null; price_per_guest_dropoff: number | null; price_per_guest_full_service: number | null };
export type QuoteSettings = { cost_settings: CostSetting[]; competitor_benchmarks: CompetitorBenchmark[] };

export function computeQuote(inquiry: QuoteInquiry, orderLines: QuoteOrderLine[], settings: QuoteSettings) {
  const value = (key: string) => {
    const result = settings.cost_settings.find(row => row.key === key)?.value_numeric;
    if (result == null || !Number.isFinite(result)) throw new Error(`Missing or invalid cost setting: ${key}`);
    return result;
  };
  const nonnegative = (number: number, label: string) => { if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid ${label}`); return number; };
  const positive = (number: number, label: string) => { if (!Number.isFinite(number) || number <= 0) throw new Error(`Invalid ${label}`); return number; };
  const ratio = (number: number, label: string) => { nonnegative(number, label); if (number >= MIN_STAFF_OR_VEHICLES) throw new Error(`Invalid ${label}`); return number; };
  const guests = positive(inquiry.guest_count, "guest count");
  if (!Number.isInteger(guests)) throw new Error("Guest count must be a whole number");
  const distance = nonnegative(inquiry.distance_mi, "distance");
  const duration = nonnegative(inquiry.event_duration_hours, "event duration");
  if (!orderLines.length) throw new Error("At least one order line is required");
  const defaultWaste = ratio(value("waste_pct_default"), "default waste");
  const wasteRates = new Set<number>();
  const food = orderLines.reduce((total, line) => {
    positive(line.qty_servings, "servings");
    if (!line.recipe_lines.length) throw new Error(`Missing recipe for ${line.menu_item_id}`);
    return total + line.recipe_lines.reduce((subtotal, recipe) => {
      if (recipe.unit !== recipe.ingredient.unit) throw new Error(`Ingredient unit mismatch for ${line.menu_item_id}`);
      const waste = recipe.ingredient.waste_pct == null ? defaultWaste : ratio(recipe.ingredient.waste_pct / PERCENT_SCALE, "ingredient waste");
      wasteRates.add(waste);
      return subtotal + positive(recipe.qty_per_serving, "recipe quantity") * line.qty_servings * nonnegative(recipe.ingredient.unit_cost_usd, "ingredient cost") * (MIN_STAFF_OR_VEHICLES + waste);
    }, 0);
  }, 0);
  const prepStaff = Math.max(MIN_STAFF_OR_VEHICLES, Math.ceil(guests / positive(value("guests_per_prep_staff"), "guests per prep staff")));
  const prepHours = nonnegative(value("base_prep_hours"), "base prep hours") + guests * nonnegative(value("prep_min_per_guest"), "prep minutes") / MINUTES_PER_HOUR;
  const serviceStaff = inquiry.service_style === "full_service" ? Math.ceil(guests / positive(value("guests_per_service_staff"), "guests per service staff")) : 0;
  const serviceHours = serviceStaff * (duration + nonnegative(value("setup_teardown_hours"), "setup hours"));
  const laborRate = nonnegative(value("labor_rate_hourly"), "labor rate");
  const burden = nonnegative(value("payroll_burden_pct"), "payroll burden");
  const labor = (prepHours + serviceHours) * laborRate * (MIN_STAFF_OR_VEHICLES + burden);
  const minWage = settings.cost_settings.find(row => row.key === "local_min_wage_hourly")?.value_numeric;
  if (minWage != null) nonnegative(minWage, "minimum wage");
  const rent = nonnegative(value("kitchen_rent_monthly"), "kitchen rent");
  const events = positive(value("events_per_month"), "events per month");
  const overhead = rent / events;
  const vehicles = Math.max(MIN_STAFF_OR_VEHICLES, Math.ceil(guests / positive(value("guests_per_vehicle"), "guests per vehicle")));
  const transport = vehicles * (nonnegative(value("transport_base_fee"), "transport base fee") + distance * ROUND_TRIP_LEGS * nonnegative(value("transport_per_mile"), "transport per mile"));
  const packagingRate = nonnegative(value("packaging_per_guest"), "packaging per guest");
  const packaging = guests * packagingRate;
  const totalCost = food + labor + overhead + transport + packaging;
  const target = ratio(value("target_margin_pct"), "target margin");
  const recommendedPrice = totalCost / (MIN_STAFF_OR_VEHICLES - target);
  const marginPct = recommendedPrice > 0 ? (recommendedPrice - totalCost) / recommendedPrice : 0;
  const pricePerGuest = recommendedPrice / guests;
  const deposit = recommendedPrice * ratio(value("deposit_pct"), "deposit percentage");
  const taxSetting = settings.cost_settings.find(row => row.key === "tax_estimate_usd")?.value_numeric ?? null;
  const tax = taxSetting == null ? null : nonnegative(taxSetting, "tax estimate");
  const green = ratio(value("margin_green_threshold"), "green margin threshold");
  const yellow = ratio(value("margin_yellow_threshold"), "yellow margin threshold");
  if (yellow > green) throw new Error("Margin thresholds are out of order");
  const comparable = settings.competitor_benchmarks.filter(b => b.min_guests == null || guests >= b.min_guests).map(b => ({ ...b, price: inquiry.service_style === "full_service" ? b.price_per_guest_full_service : b.price_per_guest_dropoff })).filter((b): b is typeof b & { price: number } => b.price != null && Number.isFinite(b.price) && b.price >= 0);
  const prices = comparable.map(b => b.price);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  // Empirical rank: share of comparable observed prices at or below our price.
  const percentile = prices.length ? PERCENT_SCALE * prices.filter(price => price <= pricePerGuest).length / prices.length : null;
  const dates = [...new Set(comparable.map(b => b.researched_on))].sort();
  return {
    food_cost: food, labor_cost: labor, overhead_cost: overhead, transport_cost: transport, packaging_cost: packaging,
    tax, total_cost: totalCost, recommended_price: recommendedPrice, margin_pct: marginPct, price_per_guest: pricePerGuest, deposit,
    prep_staff: prepStaff, prep_hours: prepHours, service_staff: serviceStaff, service_hours: serviceHours, vehicles,
    minimum_wage_flag: minWage == null ? "unverified" : laborRate < minWage ? "red" : "ok",
    margin_flag: marginPct + Number.EPSILON >= green ? "green" : marginPct + Number.EPSILON >= yellow ? "yellow" : "red",
    competitor_low: low, competitor_high: high, competitor_percentile: percentile,
    assumptions: {
      food: `Ingredient cost at current supplier pricing plus ${[...wasteRates].map(waste => `${waste * PERCENT_SCALE}%`).join(", ")} trim and spoilage allowance. Ingredient costs may be synthetic demo data.`,
      labor: `${prepHours}h prep across ${prepStaff} cooks${serviceStaff ? ` plus ${serviceStaff} servers for ${serviceHours}h` : ""} at $${laborRate}/hr with ${burden * PERCENT_SCALE}% payroll burden. Prep hours are total labor hours, not hours per cook.`,
      overhead: `$${rent}/mo kitchen amortized over ${events} events.`,
      transport: `${vehicles} vehicle(s), ${distance} mi each way.`,
      packaging: `Disposable chafers, pans, utensils at $${packagingRate}/guest.`,
      tax: "Sales tax treatment for catering varies by service style and jurisdiction — confirm with the owner before sending.",
      totals: "Total cost and recommended price exclude the separate, unconfirmed tax line.",
      competitor: dates.length ? `Comparable ${inquiry.service_style === "full_service" ? "full-service" : "drop-off"} benchmarks researched on ${dates.join(", ")}; percentile is the share of observations at or below the quoted price per guest.` : "No applicable researched competitor benchmarks available; competitor band and percentile are unavailable.",
      minimum_wage: minWage == null ? "Local minimum wage has not been verified." : `Labor rate compared with the configured local minimum wage of $${minWage}/hr; verify the applicable rate and date before the event.`,
    },
  };
}
