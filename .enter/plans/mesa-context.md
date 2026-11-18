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

## Current focus: email previews and demo scenarios

Add an owner-only `/emails` experience that makes the two audience-specific documents easy to compare for the same approved order. The current intake does not yet save inquiries, and no email delivery service is connected.

- [ ] Show two styled HTML email previews side by side for a selected approved order. The owner version includes the requested subject, order summary, approved cost components and assumptions, margin, price per guest, competitor position, and deposit. Use the approved snapshot; identify unavailable information rather than inventing it.
- [ ] The kitchen version starts with recorded dietary flags, followed by the requested subject and operational details: dishes, servings and known batch units, scaled recipes, prep times, and packing checklist. It contains no dollar figures or currency symbols. Preserve the existing data-layer separation between kitchen and financial information.
- [ ] Add a **Send test to…** field using the selected Gmail service, subject to connection authorization. Send only when an owner explicitly enters a team address and initiates the test; do not automatically send to customers or the business owner. If the destination is the owner's address, obtain his permission first. Clearly report send success or failure and do not claim delivery without confirmation. Gmail account access is required for this feature; the previews remain usable if sending is unavailable.
- [ ] Load three clearly labeled synthetic scenarios: the exact incomplete “Catering for 20 people on July 20” request; a 75-person corporate drop-off with two vegetarian guests; and a 220-person full-service quinceañera, 18 miles away and four hours long. Keep unspecified details visibly unconfirmed rather than inventing customer facts. Demonstrate the incomplete request's missing fields and available upsell suggestions without showing prices during intake.
- [ ] Make the 220-person scenario repeatable without overwriting approved quotes or deleting existing data, and verify the end-to-end flow twice. Display six prep staff, nine service staff, and two vehicles using the current settings; show actual calculated margin rather than assuming it compresses. If account access, sending authorization, or another dependency prevents an end-to-end check, identify what remains unverified.

## Current focus: intelligent, connected workflows

Make the previously requested catering workflow usable end to end, then add the selected AI assistance and shared live updates. Preserve the current visual style and existing data. This does not change the demo-only restrictions or authorize real customer messaging, live payments, or production-system access.

- [ ] Connect the existing Sazón Catering intake experience so a customer can describe an event, see captured details and missing fields, select dishes, confirm, and submit a complete synthetic or anonymized inquiry. Keep customer conversations isolated, show no intake prices, and do not claim submission succeeded if it failed. Continue using the existing agent where available; preserve its requested fallback behavior and explain any unavailable integration.
- [ ] Make the owner workflow usable from intake through a calculated draft and approval, reusing the existing cost calculator and business context. Save a new approved version without overwriting the draft, and produce the approved kitchen handoff; flag missing inputs rather than filling them with invented values.
- [ ] Add owner-facing AI quote review that identifies missing information and explains cost, assumptions, and margin concerns. Suggestions are advisory: calculations remain automatic and the owner reviews and approves any resulting changes. Show errors or unavailable AI honestly; AI usage may incur charges.
- [ ] Add AI-assisted kitchen planning that suggests preparation tasks and highlights dietary or timing risks for staff review. Use current approved operational details and stored business context, identify uncertainty, and never silently invent dietary requirements, quantities, or confirmed schedules. Kitchen-visible suggestions must contain no pricing, cost, margin, or currency.
- [ ] Keep authorized owner and kitchen screens synchronized across devices when inquiries, approvals, prep details, or checklists change. Preserve role-based data restrictions for live updates as well as ordinary queries; indicate connection problems or stale data rather than pretending updates are current.
- [ ] Preserve and verify the three-audience rule: customers never see costs or margins; kitchen users can access approved operational information only and cannot select financial fields; owners retain full access. Do not weaken authentication to enable a demonstration. Owner and kitchen account assignments still require authorized verified accounts.
- [ ] Preserve existing CRM, context, email previews, stored benchmark dates, and synthetic demo scenarios. Complete the relevant end-to-end and role-access checks where authorized accounts and necessary services are available, and report any blocked or unverified behavior.

## Current focus: landing-page redesign

Redesign the public one-page experience for La Bandera Kitchen so it feels like a distinctive Dominican catering brand, not a generic software dashboard. Research references include Awwwards’ Restaurant GEM and Flavori examples for restrained motion and hospitality-focused presentation; the result will be an original design, not a copy. “Real-time photos” is interpreted as vivid, realistic food imagery—not a live camera feed. In the absence of supplied restaurant photos, any illustrative imagery will not be presented as actual photographs of the business or its dishes.

- [ ] Create a compelling, image-led hero with a clear catering message and one obvious next step, using the established crimson, navy, and cream identity in a more editorial, food-first composition.
- [ ] Rework the live menu into a distinctive, easy-to-browse experience with useful category navigation, clear dish information, and responsive motion. Preserve the existing real menu data and selection behavior; do not show prices during intake or invent dishes.
- [ ] Add purposeful entrance, scroll, and interaction effects that enhance the experience without obscuring content or making it difficult to use. Respect reduced-motion preferences and keep the page responsive and usable on mobile and with a keyboard.
- [ ] Simplify the customer-facing journey and make the current inquiry preview and its limitations clear. Preserve selected dishes, the request summary, and the disabled submission state; do not imply that the agent or real submissions are connected when they are not.
- [ ] Keep this change focused on the public landing and intake page. Preserve staff pages, data, security rules, and existing backend connections; do not introduce a live photo feed, payments, or customer messaging.

## Current focus: reference-inspired public theme

Adapt the supplied screenshots’ vintage restaurant look to La Bandera Kitchen: warm cream, deep red, bold slab-serif headlines, compact uppercase navigation, arched food photography, simple product cards, and generous spacing. Keep the existing color family the user likes, with La Bandera’s own Dominican catering identity rather than the reference restaurant’s branding or pizza content.

- [ ] Rebuild the public landing page with a centered, oversized La Bandera headline, a welcoming food-led hero, a simple navigation, a red statement strip, featured dishes, menu categories, and a short catering story and footer inspired by the reference.
- [ ] Replace the reference’s shopping bag with an **Inquiry** action that leads to the existing request experience and reflects selected dishes where appropriate. Keep menu items and service details connected to the existing data, preserve selections, and show no prices during intake.
- [ ] Use appropriately optimized Dominican food imagery and La Bandera branding. Do not imply illustrative imagery is a photograph of the actual business; do not invent storefronts, locations, contact details, or business history. Prioritize responsive loading and accessibility.
- [ ] Retain restrained animation and clear mobile and keyboard behavior, including reduced-motion support. Preserve existing public interactions and keep the currently disconnected intake and disabled submission honestly labeled; this visual change does not connect the AI agent.
- [ ] Do not add a “Build with Enter” watermark to the site. A platform-provided badge, if present outside the site code, may depend on publishing settings and cannot be promised removed by a visual redesign.
- [ ] Limit the redesign to the public landing and inquiry experience; preserve owner, kitchen, CRM, data, permissions, and existing connections.

## Current focus: connect intake to owner and kitchen workflows

The agent chat responds, but it currently does not populate the request summary or submit an inquiry. As a result, no new owner quote or kitchen handoff is created. The owner quote calculator and approved-order kitchen screens already exist and will be reused.

- [ ] Capture and display the customer's event details and selected dishes in the live request summary. Ask for missing information, avoid inventing values, show no intake prices, and let the customer review and confirm before submitting.
- [ ] Save each confirmed demo inquiry, customer details, and order lines together, then show a truthful confirmation. Prevent duplicate submissions and explain errors without losing the customer's work. Continue to use synthetic or anonymized event data only.
- [ ] Send a confirmation email only to an explicitly authorized team test address, not to actual customers or the business owner without his permission. Make clear whether the message was accepted, failed, or its outcome is unknown; a saved inquiry must not be falsely reported as failed if email delivery fails. The Gmail connection and delivery permissions must be available before this part can work.
- [ ] Show the saved inquiry in the owner inbox and let the owner complete any missing details needed for a quote. Reuse the existing automatic cost calculation, draft and proposal preview; keep cost and margin visible only to the owner.
- [ ] On owner approval, preserve the draft, create a separate approved quote, and generate the kitchen request and prep timeline. Show only approved operational data to kitchen staff, with no financial fields accessible to their queries. No actual customer proposal, payment, or customer message is sent in this demo.
- [ ] Verify the complete flow with authorized owner and kitchen accounts, including confirmation-email behavior and direct role-access checks. If a required account or Gmail permission is unavailable, finish independent work and report the remaining steps as unverified rather than bypassing access.

## Current focus: owner feedback and handoff

This request supersedes earlier references to owner-stated cost figures: all current business figures are illustrative, not claimed facts. Preserve existing records and security; do not silently overwrite customer information whose provenance is unknown.

- [ ] Show the requested dismissible demo banner on authenticated screens, label owner quote assumptions “Sample value —”, remove owner-attribution wording for numbers throughout the app and stored context, and mark editable cost settings and ingredient values as **sample** or **owner-provided**. A saved owner edit changes that value’s provenance; it must not claim an untouched value was provided by the owner.
- [ ] Build owner-only `/settings` with the requested explanatory header and editable cost settings. Make the default values editable and show their descriptions and provenance, including explicitly unverified wage and tax values where applicable.
- [ ] Add Rabo Encendido and Maduros; lead the menu with the specified entrées, sides and Tres Leches, preserving all other dishes as “sample menu — editable.” Build owner-only `/menu` so the owner can add, edit, remove and reorder dishes, portions, recipe lines, ingredient costs, and package prices. Protect existing orders when an item is removed and keep pricing inaccessible to kitchen users and the public intake.
- [ ] Mark CRM as fictional demo records and seed clearly fictional customer names and contact details. Preserve existing records; if any existing customer cannot be established as fictional, do not misrepresent or overwrite it without authorization.
- [ ] Rename the owner strip “Workflow measurement” and show the requested no-baseline explanation. Measure inquiry-to-approval time, clarification rounds and upsell values for the current owner sign-in session, and the approved-order handoff completeness percentage; use recorded data only, show unavailable when unmeasured, and remove claimed savings or before/after improvements throughout the app.
- [ ] Build owner-only `/export` with working downloads for each requested table as CSV and a full JSON dataset export, including the supporting prototype records needed for a complete handoff. Show the requested “Your data, your terms” text, preserve access restrictions and report failures rather than delivering incomplete files as complete. Include practical ownership/access and platform-cost information without inventing commitments or prices.
- [ ] Rename the price display “Suggested price — your call,” show the requested helper and approval-authority text, and require an explicit availability confirmation before approval. Preserve the existing draft/approved version behavior and the no-automatic-customer-message rule.
- [ ] Add the requested “Prototype boundaries” section to `/context`, retain no live payments or real customer messaging, and verify owner/kitchen permissions and working export/edit behavior using authorized accounts when available.

## Delivery boundaries

The first preview will show the public inquiry experience with clearly labeled example data and disabled real submission; secure persistence, staff access, quote calculation, and remaining screens follow before final delivery. The finished app uses persistent data, not unlabeled mock behavior. Only synthetic or anonymized data is used; there is no access to production systems, real customer messaging, or live payment. This complements rather than replaces the owner's existing work. If conversational interpretation uses AI, it requires enabling the project's AI capability and may incur usage charges; unavailable AI must not produce fabricated extraction or a false success.