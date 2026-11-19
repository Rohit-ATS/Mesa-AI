export type StepKey = "name" | "email" | "date" | "time" | "guests" | "service" | "address" | "allergies" | "preferences";
export type ServiceStyle = "dropoff" | "setup" | "full_service";
export type AccommodationItem = { label: string; guests: number };
export type Accommodations = { none: boolean; items: AccommodationItem[] };
export type Details = {
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number | null;
  service: ServiceStyle | "";
  address: string;
  allergies: Accommodations | null;
  preferences: Accommodations | null;
};

export const emptyDetails: Details = { name: "", email: "", date: "", time: "", guests: null, service: "", address: "", allergies: null, preferences: null };

export const STEPS: ReadonlyArray<{ key: StepKey; label: string; missing: string; prompt: string }> = [
  { key: "name", label: "Name", missing: "name", prompt: "First, what name should go on this demo request? Please use a synthetic name." },
  { key: "email", label: "Email", missing: "email", prompt: "What email should we use to confirm your booking?" },
  { key: "date", label: "Event date", missing: "event date", prompt: "What date is your gathering?" },
  { key: "time", label: "Event time", missing: "event time", prompt: "What time does it start?" },
  { key: "guests", label: "Guests", missing: "guest count", prompt: "How many guests are you expecting? We cater a minimum of 10." },
  { key: "service", label: "Service style", missing: "service style", prompt: "Which service style would you like?" },
  { key: "address", label: "Venue address", missing: "venue address", prompt: "Where is the event? A demo venue address is fine." },
  { key: "allergies", label: "Allergies", missing: "allergies", prompt: "Does anyone have a food allergy? Choose each allergy and how many guests have it, or None." },
  { key: "preferences", label: "Preferences", missing: "dietary preferences", prompt: "Any dietary preferences, like vegetarian or halal? Choose each one with the number of guests, or None." },
];

export const SERVICES: ReadonlyArray<{ value: ServiceStyle; label: string }> = [
  { value: "dropoff", label: "Drop-off" },
  { value: "setup", label: "Setup & Serve" },
  { value: "full_service", label: "Full Service" },
];

export const NONE_CHIP = "None";
export const ALLERGY_OPTIONS = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Gluten/wheat", "Dairy", "Eggs", "Soy", "Sesame"] as const;
export const PREFERENCE_OPTIONS = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "No pork"] as const;
export const MAX_ACCOMMODATION_LABEL = 80;
export const MAX_ACCOMMODATIONS = 15;
export const MIN_GUESTS = 10;
export const MAX_GUESTS = 10000;
export const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function accommodationText(value: Accommodations | null) {
  if (!value) return "";
  if (value.none) return NONE_CHIP;
  return value.items.map(item => `${item.label} (${item.guests} ${item.guests === 1 ? "guest" : "guests"})`).join(", ");
}

/** Accommodation guest counts that exceed the total guest count. */
export function accommodationOverages(details: Details) {
  if (details.guests === null) return [];
  const total = details.guests;
  return [...(details.allergies?.items ?? []), ...(details.preferences?.items ?? [])].filter(item => item.guests > total).map(item => item.label);
}

export function isCaptured(details: Details, key: StepKey) {
  switch (key) {
    case "name": return details.name.trim().length > 0;
    case "email": return EMAIL_PATTERN.test(details.email.trim());
    case "date": return details.date.length > 0;
    case "time": return details.time.length > 0;
    case "guests": return details.guests !== null;
    case "service": return details.service !== "";
    case "address": return details.address.trim().length > 0;
    case "allergies": return accommodationText(details.allergies).length > 0;
    case "preferences": return accommodationText(details.preferences).length > 0;
  }
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function displayValue(details: Details, key: StepKey) {
  switch (key) {
    case "name": return details.name.trim();
    case "email": return details.email.trim();
    case "date": return formatDate(details.date);
    case "time": return formatTime(details.time);
    case "guests": return details.guests === 1 ? "1 guest" : `${details.guests} guests`;
    case "service": return SERVICES.find(service => service.value === details.service)?.label ?? "";
    case "address": return details.address.trim();
    case "allergies": return accommodationText(details.allergies);
    case "preferences": return accommodationText(details.preferences);
  }
}

export function missingLabels(details: Details, dishCount: number) {
  const missing = STEPS.filter(step => !isCaptured(details, step.key)).map(step => step.missing);
  if (dishCount < 1) missing.push("at least 1 dish");
  if (details.guests !== null && details.guests < MIN_GUESTS) missing.push(`at least ${MIN_GUESTS} guests (our catering minimum)`);
  const over = accommodationOverages(details);
  if (over.length) missing.push(`guest counts for ${over.join(", ")} must not exceed ${details.guests} guests`);
  return missing;
}

export function capturedCount(details: Details) {
  return STEPS.filter(step => isCaptured(details, step.key)).length;
}

export function dishLabel(count: number) {
  return count === 1 ? "1 dish" : `${count} dishes`;
}
