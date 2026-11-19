// Shared kitchen packing checklist and prep-state rules (used by kitchen board, calendars and inbox filters).
export const CHECKLIST_ITEMS = [
  { key: "pans", label: "Pack dishes and pans" },
  { key: "utensils", label: "Pack serving utensils" },
  { key: "dietary", label: "Separate dietary meals" },
  { key: "labels", label: "Label every dish" },
  { key: "transport", label: "Load and secure for transport" },
] as const;

export type PrepState = "prepared" | "in_progress" | "not_started";

export function prepState(checklist: Record<string, boolean>): PrepState {
  const done = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length;
  return done === CHECKLIST_ITEMS.length ? "prepared" : done > 0 ? "in_progress" : "not_started";
}

export function prepProgress(checklist: Record<string, boolean>) {
  return { done: CHECKLIST_ITEMS.filter(i => checklist[i.key]).length, total: CHECKLIST_ITEMS.length };
}

export function checklistFromRows(rows: { item_key: string; done: boolean }[] | null | undefined) {
  return Object.fromEntries((rows || []).map(r => [r.item_key, r.done])) as Record<string, boolean>;
}

export const prepLabel: Record<PrepState, string> = { prepared: "Prepared", in_progress: "In progress", not_started: "Not started" };

// Semantic classes for badges / calendar chips.
export const prepClass: Record<PrepState, string> = {
  prepared: "bg-status-green text-primary-foreground",
  in_progress: "bg-status-yellow text-secondary",
  not_started: "bg-muted text-muted-foreground",
};

/** Today's date in the business time zone, as YYYY-MM-DD. */
export function todayLA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
