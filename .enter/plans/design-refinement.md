# Inquiry redesign: guided chat with a live request card

The inquiry popup becomes a chat-first experience. Quick-pick controls inside the chat collect each event detail, and a read-only "Your request so far" card updates as the customer answers. A review step ends in one demo submit button. The popup is restyled to match the public site. The Sazón Catering free-text chat stays available. Owner and kitchen pages, data, menu, and the rest of the public site are not changed.

## How the chat works
- [ ] The chat opens with a short welcome and walks through the details one at a time, in this order: name, event date, event time, guest count, service style, venue address, dietary needs. Each step is a short assistant message with its control directly under it.
- [ ] The controls are:
  - Name and venue address: a short inline text field with a confirm button.
  - Date: a date picker. Time: a time picker.
  - Guest count: a stepper with minus and plus buttons and a typed number, accepting 1 to 10,000.
  - Service style: three large buttons (Drop-off, Setup & Serve, Full Service).
  - Dietary needs: toggle chips (None, Vegetarian, Vegan, Gluten-free, Dairy-free, Nut allergy) plus an "Other" chip that reveals a short text box. "None" clears the other chips and the other chips clear "None". Dietary needs count as answered only after the customer confirms. The customer must pick at least one chip, or "None", so an unanswered question is never treated as no restrictions.
- [ ] Answering a control writes it straight to the summary card and the chat shows the answer as the customer's reply. The chat then moves to the next unanswered detail.
- [ ] The customer can type to Sazón at any time. Sazón's replies appear in the same thread. This is a conversation only: Sazón's answers are not read back into the card, because no assistant or backend change is part of this work. The chat says so in one short line.
- [ ] Empty or invalid answers (blank name, a past or missing date, 0 guests) show a clear message in red under the control and are not saved.

## The "Your request so far" card
- [ ] A read-only card on the right replaces the navy form. It has a brick-red slab heading, "THE DETAILS" and field labels in uppercase Oswald, and a progress bar reading "5 of 7 details". The seven details are name, date, time, guests, service style, address, and dietary needs.
- [ ] Each field shows a check and its value once captured, and "Still needed" when missing.
- [ ] Each field has an "Edit" link. Clicking it scrolls to the chat and reopens that control with the current value filled in. Saving the new value updates the card, and the old reply in the chat is marked as updated rather than left contradicting the card.
- [ ] Selected dishes appear as removable chips at the top of the card, and removing one also unselects it in the menu. With no dishes the card says "Choose dishes from the menu".
- [ ] The card stays sticky beside the chat on desktop. The note "Chat answers are not automatically copied yet" is removed.

## Review and submit
- [ ] A "Review and confirm" step lists every detail and every dish in one summary, with an Edit link on each row and a way back to the chat.
- [ ] One "Submit demo inquiry" button saves the request. It is disabled until all seven details and at least one dish are set, and a line beside it says exactly what is missing (for example "Still needed: event time, 1 dish").
- [ ] On success the card and review show: "Saved as a demo inquiry. No email was sent." Controls are locked and a repeat submit is not possible.
- [ ] If saving fails, the real error is shown, the customer's answers and dishes are kept, and the customer can retry. The success message never appears for a failed save.
- [ ] The existing protected demo submission is reused as-is. The answers are sent to it in the same shape as today, with dietary chips joined into one text value. Demo labeling and synthetic-data wording stay.

## Visual changes
- [ ] The popup and the chat use the site's cream background and brick-red slab heading. The navy block and the older dashboard-style cards, small labels and rounded corners are removed.
- [ ] Dominican blue (#002D62) is used only for selected-dish chips, the progress bar, and the count badge. Brick red is used for everything else that needs emphasis.
- [ ] The Send button is solid brick red with light text whenever there is text to send. It looks muted only when the box is empty or a reply is in progress.
- [ ] The chat panel grows to fit its content up to a sensible height, then scrolls, with no large empty area below the input.
- [ ] Mobile shows a single column: the chat, with the card replaced by a sticky bottom bar reading, for example, "3 dishes · 5 of 7 details · Review". Tapping Review opens the review step. Nothing is stacked as two competing panels.
- [ ] All text is at least 12px, all buttons, chips, steppers and inputs are at least 44px tall to tap, and errors are shown in red text with an icon, not by color alone. Contrast meets WCAG AA on cream.
- [ ] Controls work with a keyboard, with visible focus, and chat updates are announced to screen readers.

## Kept as is
- Customers never see prices anywhere in the inquiry, including Sazón's replies.
- Demo-only wording and synthetic data remain, and no email, payment or customer message is sent.
- Menu browsing and selection, the header inquiry badge, the owner and kitchen pages, the owner inbox, and the data model are unchanged.

## Assumptions
- Guided questions are scripted in the page, not generated by Sazón. Only the quick-pick answers fill the card.
- Name is collected as a demo customer name, as it is today.
- The "Other" dietary text is limited to 250 characters, matching what the saved request accepts.
- Time is saved as entered. The app does not check it against the venue's hours.
