# Mesa — La Bandera Kitchen catering operations

Build a demo-only workflow that turns a plain-language catering request into an owner quote, a customer proposal preview, and an approved-order kitchen sheet. Use the business context as the shared source of truth. The design will be warm and appetizing, using crimson, navy, cream, charcoal, generous whitespace, and a small Dominican flag accent.

## Data model

The following records retain the requested fields and relationships:

- **business_context:** id, section, content, updated_at. Seed the five originally supplied sections exactly, without overwriting later edits.
- **customer:** id, name, email, phone, org_type (corporate, private, school, nonprofit, community), notes, created_at.
- **inquiry:** id, customer_id, raw_text, channel, event_date, event_time, guest_count, service_style (dropoff, setup, full_service), venue_address, venue_zip, distance_mi, event_duration_hours, dietary_flags, budget_hint, completeness_score (0–100), missing_fields, status (new, clarifying, quoted, approved, declined), upsell_value_usd, created_at.
- **menu_item:** id, name_es, name_en, category (entree, side, appetizer, dessert, beverage), portion_size_oz, base_yield_servings, is_upsell, dietary_tags, active.
- **ingredient:** id, name, unit, unit_cost_usd, supplier, waste_pct, last_updated.
- **recipe_line:** id, menu_item_id, ingredient_id, qty_per_serving, unit.
- **order_line:** id, inquiry_id, menu_item_id, qty_servings, note.
- **quote:** id, inquiry_id, food_cost, labor_cost, overhead_cost, transport_cost, packaging_cost, tax, total_cost, recommended_price, margin_pct, price_per_guest, competitor_low, competitor_high, competitor_percentile, assumptions_json, version, status (draft, approved, sent), created_at.
- **prep_task:** id, inquiry_id, menu_item_id, qty_servings, prep_notes, station, due_at, done.
- **cost_setting:** id, key, value_numeric, unit, description, editable.
- **competitor_benchmark:** id, business_name, city, price_per_guest_dropoff, price_per_guest_full_service, min_guests, source_url, researched_on.

Supporting records will establish trusted staff roles and persistent packing checklists. Menu, ingredient, recipe, settings, and benchmark examples will be clearly identified as synthetic; unknown real-world rates and data will not be presented as verified facts. The supplied $22/hour labor and $500/month rent are owner-stated starting values.

## Permission structure

- **Public customer:** can browse the active menu and submit an inquiry, but cannot read other customers, inquiries, quotes, costs, margins, internal context, or staff data. Intake displays no prices. Submissions are validated and do not grant access to existing records.
- **Owner:** authenticated and explicitly assigned the owner role; can read and manage the full workflow, including costs, margins, settings, CRM, and context.
- **Kitchen:** authenticated and explicitly assigned the kitchen role; can access only approved orders and their operational details, and update permitted task and packing checkboxes. Kitchen-accessible queries expose only operational fields and cannot select pricing, cost, margin, or other financial fields, including through underlying tables or related records. Kitchen views and previews render no currency.
- Roles are assigned through a trusted administrative process, not public self-selection. Access is enforced by the data layer, including direct requests; access is denied by default. Secure account provisioning will require authorized staff details rather than invented credentials.

## Screens and behavior

- [ ] **/inquire:** provide a guided conversation for plain-language requests, a live “Your request so far” summary, browsable menu, confirmation, and submission. Gather missing information without inventing answers, calculate completeness, and never show prices during intake. Explain errors without claiming an unsuccessful submission succeeded.
- [ ] **/owner:** show the inquiry inbox with status, guests, date, completeness ring, and quoted margin. Quote detail shows order summary, component costs, assumptions, editable driving variables, and immediate recalculation without a save button or reload. Costs themselves are calculated automatically, not manually entered. Include a 20–50% target margin slider defaulting to 35%, competitor band, and the requested green/yellow/red margin thresholds.
- [ ] Calculate estimates from recipes, ingredients, settings, event details and the stored business context; account for labor, staffing, kitchen rent, transport, packaging, taxes and the applicable minimum wage floor. Clearly show assumptions and flag missing inputs rather than inventing authoritative figures. Synthetic benchmarks must be labeled and not presented as researched competitors.
- [ ] Provide customer proposal and kitchen sheet previews, and an **Approve & Send** action. In this demo, approval makes the order available to the kitchen, but no real customer message is sent; clearly say so and do not claim delivery. No live payments or deposit processing.
- [ ] **/kitchen:** display approved orders only, with a prominent red dietary banner, large-type dishes and servings, batch units, recipe quantities, prep timeline, and persistent packing checkboxes. No currency appears anywhere.
- [ ] **/crm:** provide an owner-only customer list and profile with notes and full order history.
- [ ] **/settings:** let the owner edit each editable cost setting with its description visible; respect settings marked non-editable.
- [ ] **/context:** provide owner-only reading and editing of the five supplied context sections, with update times, persistent saves, and clear failure states. Later calculations and any assistant must consult the current stored context, while customer and kitchen access remains restricted.

## Delivery boundaries

The first preview will show the public inquiry experience with clearly labeled example data and disabled real submission; secure persistence, staff access, quote calculation, and remaining screens follow before final delivery. The finished app uses persistent data, not unlabeled mock behavior. Only synthetic or anonymized data is used; there is no access to production systems, real customer messaging, or live payment. This complements rather than replaces the owner's existing work. If conversational interpretation uses AI, it requires enabling the project's AI capability and may incur usage charges; unavailable AI must not produce fabricated extraction or a false success.