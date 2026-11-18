# Mesa — business context

Create a simple, private `/context` page for La Bandera Kitchen as the first piece of the app.

- [ ] Show the five supplied sections—business, problem, three_audience_rule, operating_numbers, and demo_constraints—in a readable layout, preserving their supplied content and identifying the last update.
- [ ] Let the authorized owner edit and save each section to a persistent `business_context` table with `id`, `section`, `content`, and `updated_at`. Seed each section once without overwriting subsequent edits; show clear loading, save, and error states.
- [ ] Require owner authentication and enforce owner-only reading and editing in the data layer, not just by hiding the page. Provision owner access securely without inventing credentials or allowing public signups to claim the owner role; any required owner account details will be collected through the appropriate secure setup.
- [ ] Keep the stored context as the authoritative reference for future agents and calculations. This step does not build those agents or calculations; future customer and kitchen data access must enforce the stated audience restrictions at the data layer.
- [ ] Keep this a demo with synthetic or anonymized data only: no live payments, real customer messaging, or production system access. Do not replace the owner's existing development work.

The first preview will show the context page with the supplied text clearly labeled as preview content and saving unavailable until secure storage and owner access are connected. The finished page will use the persisted records rather than preview data.