# La Bandera Kitchen: design refinement

The result is the same site with the same layout, copy, section order, brand voice, brick red and slab display font. It gets a cleaner cream look, more readable text, a sparing Dominican-blue accent, and type-only menu cards. The public landing page is the only part that changes. Staff pages (Owner, CRM, Kitchen, Admin) and all inquiry behavior stay as they are.

## Background and text
- [ ] The page background is warm cream (#F3EBDD). The current tan appears only on the alternating bands: the marquee strip and the footer.
- [ ] Body text is dark brown (#2B1D17). Secondary and muted text is darkened so every text and background pair meets WCAG AA (4.5:1 for normal text).
- [ ] Text on the tan bands (marquee, footer) switches to dark brown, because brick red on tan is below AA. Brick red stays for headlines and buttons on cream.
- [ ] No text is smaller than 12px anywhere on the public page. That includes eyebrow labels, the top bar, card meta text, nav, buttons, the footer line and the header logo text.

## Typography
- [ ] The slab display font gets positive letter-spacing, replacing the current tight negative spacing. This covers the hero "LA BANDERA KITCHEN", "Made for the table.", "Good food is better together.", the story headline, the service headline and the overlay text on the hero photo. Letters no longer touch.
- [ ] The slab font is used only for large section headlines. Menu card titles and the service names (Drop-off, Setup & Serve, Full Service) switch to the condensed nav sans, bold and uppercase. The smaller "Pick your favorites." subhead also moves off the slab font.

## Accent blue (#002D62)
- [ ] Blue appears only on the selected menu card state, the inquiry count badge, and small tags (dietary tags). Everything else keeps the current red.
- [ ] The inquiry link in the header shows the count as a small blue badge, e.g. "YOUR INQUIRY" with a blue "0" pill. The count updates as dishes are added or removed.

## Menu cards
- [ ] The repeated placeholder photo and its "ILLUSTRATIVE IMAGE" tag are removed from every card. Each card shows only the number, dish name, English description, serving size and dietary tag.
- [ ] The whole card is one clickable target that adds or removes the dish. It is keyboard-accessible and announces its selected state.
- [ ] Selected cards have a blue border, a light blue-tinted background and a check icon in the top-right corner. Unselected cards have no check or plus button.
- [ ] The "SAMPLE MENU — EDITABLE" label is removed.
- [ ] The "ILLUSTRATIVE IMAGE" tags are also removed from the hero photo and the story photo, since you asked for all of them to go.

## Empty space and callouts
- [ ] In "We'll bring the sabor", a primary "Plan your gathering" button sits under the headline on the left and opens the inquiry as the other "Plan your gathering" links do.
- [ ] In the footer CTA, the small "Back to the menu" link is replaced by a primary button on the right. The label stays "Back to the menu" and it still goes to the menu. On mobile it stacks below the headline.
- [ ] The "La Bandera Plate — One entrée with Arroz Blanco and Habichuelas Guisadas" line becomes a highlighted callout box above the menu tabs. It has a brick-red accent edge on a light cream-tint fill, with the plate name emphasized. The text is unchanged and it still appears only when the package loads.

## Cleanup
- [ ] The footer CTA eyebrow changes from "FROM OAKLAND, WITH CORAZÓN" to "LET'S GATHER". The story section keeps the original. This is a new line of copy, so tell me if you want different wording.
- [ ] In the hero's right-hand side text, "Good food. Good people." becomes "Made for sharing." It remains in the top bar.
- [ ] The footer uses the same content width and side margins as the rest of the page (1200px container with 1.5rem padding).
- [ ] The short red divider is removed where it sits directly above a full-width line: under the hero (above the marquee border) and under the story section (above the footer border). The divider between the menu and story stays, since no line follows it.
- [ ] The header logo seal is enlarged from 64px to 72px, and its inner text is raised to at least 12px so it stays legible. It also scales sensibly on small screens.

## Unchanged
- Copy (apart from the two replacements above), section order, menu loading, add/remove behavior, the inquiry dialog and its chat summary, and all staff pages.
- Mobile and tablet layouts stay responsive after these changes.

## Assumptions
- "Current tan" means the existing tan page color (about #B5A98F). It is kept as-is for the marquee and footer.
- The nav's condensed sans is Oswald, which the site already loads. It is used for card titles and service names.
- The blue badge uses the existing inquiry count, so no new data is needed.
