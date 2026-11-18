export type StepKey = "name" | "email" | "date" | "time" | "guests" | "service" | "address" | "dietary";
export type ServiceStyle = "dropoff" | "setup" | "full_service";
export type Dietary = { chips: string[]; other: string };
export type Details = {
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number | null;
  service: ServiceStyle | "";
  address: string;
  dietary: Dietary | null;
};

export const emptyDetails: Details = { name: "", email: "", date: "", time: "", guests: null, service: "", address: "", dietary: null };

export const STEPS: ReadonlyArray<{ key: StepKey; label: string; missing: string; prompt: string }> = [
  { key: "name", label: "Name", missing: "name", prompt: "First, what name should go on this demo request? Please use a synthetic name." },
  { key: "email", label: "Email", missing: "email", prompt: "What email should we use to confirm your booking?" },
  { key: "date", label: "Event date", missing: "event date", prompt: "What date is your gathering?" },
  { key: "time", label: "Event time", missing: "event time", prompt: "What time does it start?" },
  { key: "guests", label: "Guests", missing: "guest count", prompt: "How many guests are you expecting?" },
  { key: "service", label: "Service style", missing: "service style", prompt: "Which service style would you like?" },
  { key: "address", label: "Venue address", missing: "venue address", prompt: "Where is the event? A demo venue address is fine." },
  { key: "dietary", label: "Dietary needs", missing: "dietary needs", prompt: "Any dietary needs we should plan for? Choose all that apply, or None." },
];

export const SERVICES: ReadonlyArray<{ value: ServiceStyle; label: string }> = [
  { value: "dropoff", label: "Drop-off" },
  { value: "setup", label: "Setup & Serve" },
  { value: "full_service", label: "Full Service" },
];

export const NONE_CHIP = "None";
export const DIETARY_CHIPS = [NONE_CHIP, "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut allergy"] as const;
export const MAX_DIETARY_LENGTH = 250;
export const MAX_GUESTS = 10000;
export const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dietaryText(dietary: Dietary | null) {
  if (!dietary) return "";
  if (dietary.chips.includes(NONE_CHIP)) return NONE_CHIP;
  return [...dietary.chips, dietary.other.trim()].filter(Boolean).join(", ");
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
    case "dietary": return dietaryText(details.dietary).length > 0;
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
    case "dietary": return dietaryText(details.dietary);
  }
}

export function missingLabels(details: Details, dishCount: number) {
  const missing = STEPS.filter(step => !isCaptured(details, step.key)).map(step => step.missing);
  if (dishCount < 1) missing.push("at least 1 dish");
  return missing;
}

export function capturedCount(details: Details) {
  return STEPS.filter(step => isCaptured(details, step.key)).length;
}

export function dishLabel(count: number) {
  return count === 1 ? "1 dish" : `${count} dishes`;
}
