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

## Current focus: owner quote detail

This change focuses on the owner quote detail and its approval prerequisites; it does not add an AI workflow. The wider application scope above remains in place but is not represented as already complete. The current app has a calculator and menu/settings data, but no inquiry, quote, preparation-task, or competitor records yet, and owner access still needs an authorized account assignment.

- [ ] Create an owner-only `/owner` quote detail experience with customer and event details, status, and compact order summary. Where no inquiry is available, show an honest empty state; use synthetic or anonymized data only.
- [ ] Make the cost build-up the centerpiece: food, labor, overhead, transport, packaging, and total, with calculator assumptions and a relevant numeric driving input for each adjustable component. Recalculate all dependent figures immediately on valid changes, animate changed values briefly, and show invalid or missing inputs without producing a misleading quote. Adjustments apply to the current quote, not silently to global defaults.
- [ ] Include the 20–50% margin slider, price and per-guest price, margin and minimum-wage indicators, and a separately identified unconfirmed tax line. Show the applicable competitor band, empirical percentile, and research dates when real benchmark records exist; otherwise show an unavailable state rather than inventing comparisons or calling an outside-range price within range.
- [ ] Provide a customer proposal preview that excludes cost and margin, and a kitchen sheet preview that contains operational details and no currency. Continue to enforce financial isolation at the data layer, not only in presentation.
- [ ] On approval, preserve the draft and create a new approved quote version, mark the inquiry approved, and generate preparation tasks scheduled backwards from the event time. Treat these changes as one operation: if any part fails, do not report approval or leave a partial result. Require a valid event time and sufficient order and recipe information; show failures clearly and prevent duplicate approvals from repeated clicks.
- [ ] Keep the demo boundary: **Approve & Send** records approval but does not send a real message or process a payment, and the screen makes that explicit. Maintain owner-only access to financial information and approved-order-only kitchen access; owner provisioning remains dependent on the previously requested verified account.

## Current focus: owner inbox metrics

The owner page currently opens quote detail rather than an inbox, and existing records do not yet capture clarification rounds. The figures will come from stored operational records, not fixed display values. The sample history will be clearly labeled synthetic demo data.

- [ ] Add an owner-only inquiry inbox at `/owner`, retaining access to the existing quote detail, and place a four-metric strip above the inquiry list. Preserve the existing owner-only financial data restrictions.
- [ ] Show median elapsed time from inquiry receipt to its first approved proposal, using actual recorded timestamps; exclude inquiries without a valid approval and show an unavailable state when there are none.
- [ ] Show average recorded clarification rounds per inquiry. Record synthetic clarification history for the examples, distinguish a recorded zero from missing history, and do not present unrecorded rounds as zero. The current intake does not yet record clarification rounds, so new inquiries without that information will remain unmeasured until the intake workflow supports it.
- [ ] Show the percentage of approved orders with a complete kitchen handoff. For this initial definition, require event date and time, delivery location, service style, guest count, explicit dietary information, at least one dish with servings and recipe, and scheduled preparation tasks. Show the definition and an unavailable state when there are no approved orders; an unknown dietary response is not treated as confirmed “none.”
- [ ] Show upsell value for the current calendar month in Oakland time, using recorded upsell values on inquiries received in that period. Label the period; do not invent values for missing data.
- [ ] Seed a modest set of varied synthetic historical inquiries, approval times, clarification records, handoff details, and upsell values so the metrics are meaningful. Preserve existing business data, do not overwrite prior records, and make synthetic data identifiable in the inbox and metrics.
- [ ] Handle loading, missing data, and access errors honestly. No real customer messaging, production access, payments, or AI workflow is introduced.

## Current focus: intake agent and kitchen

Integrate the attached **Sazón Catering** agent into the existing intake design, rather than replacing the app with a generic chat. The intake is currently a disconnected preview, and there is no kitchen page or assigned kitchen user yet.

- [ ] Connect the existing conversation to Sazón Catering, preserving conversation history and showing responses, progress, questions, errors, and cancellation. Keep the agent credential server-side and isolate each public customer's conversation from other customers. If the external agent is unavailable, use the requested native server-side intake only if the necessary model access and matching instruction block are available; otherwise explain the blocker instead of pretending it works.
- [ ] Update the request card as information is captured, with a completeness ring and clearly labeled missing date, time, guest count, service style, location, dishes, and dietary notes. Ask for clarification rather than inventing values. Keep the menu browsable and show no prices anywhere during intake.
- [ ] When an upsell is accepted, briefly show a non-price “Added to your request” confirmation, as requested in clarification. Record its owner-only value only when supported by verified pricing; do not invent a dollar amount. After all required fields are complete and the customer confirms, save the inquiry and order lines together; report failures without claiming submission succeeded. Respect the existing synthetic/anonymized demo-data restriction and do not send real customer messages or take payments.
- [ ] Create `/kitchen` for authenticated kitchen staff, listing only approved orders by event date. Each event shows a prominent red dietary banner when applicable, then date, service time, venue area, guests, Spanish and English dishes, servings, batch units, scaled recipes, prep timeline, and persistent packing and transport checkboxes. Use large, high-contrast type. Do not invent dietary counts or batch yields when they are not recorded; mark them for confirmation.
- [ ] Enforce kitchen access to approved operational data only at the data layer: kitchen queries must not be able to select any price, cost, or margin fields. Neither the kitchen screen nor its accessible content may contain currency symbols or amounts. Checklist updates must be limited to authorized kitchen staff and approved orders.
- [ ] Test using an actual assigned kitchen account, including the requested Ctrl-F search for `$` and direct data-access checks. Account role assignment must be authorized; if no kitchen account is available, report the test as unverified rather than bypassing access. Preserve the owner experience and existing data.

## Delivery boundaries

The first preview will show the public inquiry experience with clearly labeled example data and disabled real submission; secure persistence, staff access, quote calculation, and remaining screens follow before final delivery. The finished app uses persistent data, not unlabeled mock behavior. Only synthetic or anonymized data is used; there is no access to production systems, real customer messaging, or live payment. This complements rather than replaces the owner's existing work. If conversational interpretation uses AI, it requires enabling the project's AI capability and may incur usage charges; unavailable AI must not produce fabricated extraction or a false success.