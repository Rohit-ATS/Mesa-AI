import { useId, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Check, Minus, Plus, X } from "lucide-react";
import {
  ALLERGY_OPTIONS, EMAIL_PATTERN, MAX_ACCOMMODATIONS, MAX_ACCOMMODATION_LABEL, MAX_GUESTS, MIN_GUESTS, NONE_CHIP, PREFERENCE_OPTIONS, SERVICES, todayString,
  type Details, type StepKey,
} from "./types";

type SaveFn = <K extends StepKey>(key: K, value: Details[K]) => void;
type ControlProps = { details: Details; onSave: SaveFn; onCancel?: () => void; autoFocus: boolean };

function FieldError({ id, message }: { id: string; message: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="iq-error"><AlertCircle size={16} aria-hidden="true" /><span>{message}</span></p>;
}

function Actions({ onCancel, saveLabel = "Save" }: { onCancel?: () => void; saveLabel?: string }) {
  return (
    <div className="iq-actions">
      <button type="submit" className="iq-btn iq-primary">{saveLabel}</button>
      {onCancel && <button type="button" onClick={onCancel} className="iq-btn iq-secondary">Cancel</button>}
    </div>
  );
}

function ControlForm({ onSubmit, children }: { onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  return <form className="iq-control" onSubmit={onSubmit} noValidate>{children}</form>;
}

function TextControl({ field, label, placeholder, maxLength, details, onSave, onCancel, autoFocus }: ControlProps & { field: "name" | "address"; label: string; placeholder: string; maxLength: number }) {
  const id = useId();
  const [value, setValue] = useState(details[field]);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { setError(`Enter ${field === "name" ? "a name" : "an address"} to continue.`); return; }
    onSave(field, trimmed);
  }
  return (
    <ControlForm onSubmit={submit}>
      <label htmlFor={id} className="iq-label">{label}</label>
      <input id={id} className="iq-input" value={value} maxLength={maxLength} placeholder={placeholder} autoFocus={autoFocus}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => { setValue(event.target.value); setError(""); }} />
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} />
    </ControlForm>
  );
}

function EmailControl({ details, onSave, onCancel, autoFocus }: ControlProps) {
  const id = useId();
  const [value, setValue] = useState(details.email);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!EMAIL_PATTERN.test(trimmed) || trimmed.length > 254) { setError("Enter a valid email address, like name@example.com."); return; }
    onSave("email", trimmed);
  }
  return (
    <ControlForm onSubmit={submit}>
      <label htmlFor={id} className="iq-label">Email</label>
      <input id={id} type="email" autoComplete="email" className="iq-input" value={value} maxLength={254} placeholder="name@example.com" autoFocus={autoFocus}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => { setValue(event.target.value); setError(""); }} />
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} />
    </ControlForm>
  );
}

function DateControl({ details, onSave, onCancel, autoFocus }: ControlProps) {
  const id = useId();
  const today = todayString();
  const [value, setValue] = useState(details.date);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value) { setError("Choose a date to continue."); return; }
    if (value < today) { setError("Choose today or a future date."); return; }
    onSave("date", value);
  }
  return (
    <ControlForm onSubmit={submit}>
      <label htmlFor={id} className="iq-label">Event date</label>
      <input id={id} type="date" className="iq-input" min={today} value={value} autoFocus={autoFocus}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => { setValue(event.target.value); setError(""); }} />
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} />
    </ControlForm>
  );
}

function TimeControl({ details, onSave, onCancel, autoFocus }: ControlProps) {
  const id = useId();
  const [value, setValue] = useState(details.time);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value) { setError("Choose a time to continue."); return; }
    onSave("time", value);
  }
  return (
    <ControlForm onSubmit={submit}>
      <label htmlFor={id} className="iq-label">Event time</label>
      <input id={id} type="time" className="iq-input" value={value} autoFocus={autoFocus}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => { setValue(event.target.value); setError(""); }} />
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} />
    </ControlForm>
  );
}

function GuestsControl({ details, onSave, onCancel, autoFocus }: ControlProps) {
  const id = useId();
  const [raw, setRaw] = useState(String(details.guests ?? 20));
  const [error, setError] = useState("");
  function nudge(delta: number) {
    const current = /^\d+$/.test(raw) ? Number(raw) : 0;
    setRaw(String(Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, current + delta))));
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < 1 || value > MAX_GUESTS) { setError("Enter a whole number up to 10,000."); return; }
    if (value < MIN_GUESTS) { setError(`La Bandera Kitchen caters a minimum of ${MIN_GUESTS} guests.`); return; }
    onSave("guests", value);
  }
  return (
    <ControlForm onSubmit={submit}>
      <label htmlFor={id} className="iq-label">Guest count</label>
      <div className="iq-stepper">
        <button type="button" className="iq-step-btn" aria-label="Fewer guests" onClick={() => nudge(-1)}><Minus size={18} aria-hidden="true" /></button>
        <input id={id} className="iq-input iq-number" inputMode="numeric" value={raw} autoFocus={autoFocus}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => { setRaw(event.target.value.trim()); setError(""); }} />
        <button type="button" className="iq-step-btn" aria-label="More guests" onClick={() => nudge(1)}><Plus size={18} aria-hidden="true" /></button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} saveLabel="Confirm" />
    </ControlForm>
  );
}

function ServiceControl({ details, onSave, onCancel }: ControlProps) {
  return (
    <div className="iq-control" role="group" aria-label="Service style">
      <div className="iq-services">
        {SERVICES.map(service => (
          <button key={service.value} type="button" className="iq-service" aria-pressed={details.service === service.value}
            onClick={() => onSave("service", service.value)}>{service.label}</button>
        ))}
      </div>
      {onCancel && <div className="iq-actions"><button type="button" onClick={onCancel} className="iq-btn iq-secondary">Cancel</button></div>}
    </div>
  );
}

type Picked = { label: string; raw: string; custom: boolean };

function AccommodationControl({ field, details, onSave, onCancel, autoFocus }: ControlProps & { field: "allergies" | "preferences" }) {
  const id = useId();
  const isAllergy = field === "allergies";
  const options: readonly string[] = isAllergy ? ALLERGY_OPTIONS : PREFERENCE_OPTIONS;
  const current = details[field];
  const [none, setNone] = useState(!!current?.none);
  const [picked, setPicked] = useState<Picked[]>(() => (current?.items ?? []).map(item => ({ label: item.label, raw: String(item.guests), custom: !options.includes(item.label) })));
  const [error, setError] = useState("");
  const noun = isAllergy ? "allergy" : "preference";

  function toggleOption(label: string) {
    setError(""); setNone(false);
    setPicked(previous => previous.some(item => item.label === label && !item.custom) ? previous.filter(item => item.label !== label || item.custom) : [...previous, { label, raw: "", custom: false }]);
  }
  function update(index: number, patch: Partial<Picked>) {
    setError("");
    setPicked(previous => previous.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (none) { onSave(field, { none: true, items: [] }); return; }
    if (!picked.length) { setError(`Choose each ${noun} with its guest count, or None.`); return; }
    if (picked.length > MAX_ACCOMMODATIONS) { setError(`Please list at most ${MAX_ACCOMMODATIONS}.`); return; }
    const items = [];
    for (const item of picked) {
      const label = item.label.trim();
      if (!label) { setError(`Name the other ${noun}, or remove it.`); return; }
      const guests = Number(item.raw);
      if (!/^\d+$/.test(item.raw) || guests < 1) { setError(`Enter how many guests need ${label}.`); return; }
      if (details.guests !== null && guests > details.guests) { setError(`${label}: ${guests} guests is more than the ${details.guests} guests attending.`); return; }
      if (items.some(existing => existing.label.toLowerCase() === label.toLowerCase())) { setError(`${label} is listed twice.`); return; }
      items.push({ label, guests });
    }
    onSave(field, { none: false, items });
  }
  return (
    <ControlForm onSubmit={submit}>
      <span className="iq-label" id={`${id}-label`}>{isAllergy ? "Food allergies" : "Dietary preferences"}</span>
      <div className="iq-chips" role="group" aria-labelledby={`${id}-label`}>
        <button type="button" className="iq-chip" aria-pressed={none} autoFocus={autoFocus}
          onClick={() => { setError(""); setNone(!none); if (!none) setPicked([]); }}>{none && <Check size={16} aria-hidden="true" />}{NONE_CHIP}</button>
        {options.map(option => {
          const on = picked.some(item => item.label === option && !item.custom);
          return <button key={option} type="button" className="iq-chip" aria-pressed={on} onClick={() => toggleOption(option)}>{on && <Check size={16} aria-hidden="true" />}{option}</button>;
        })}
        <button type="button" className="iq-chip" onClick={() => { setError(""); setNone(false); setPicked(previous => [...previous, { label: "", raw: "", custom: true }]); }}><Plus size={16} aria-hidden="true" />Other</button>
      </div>
      {picked.length > 0 && (
        <div className="iq-accoms">
          <p className="iq-muted">How many guests need each one?{details.guests !== null && ` (${details.guests} guests total)`}</p>
          {picked.map((item, index) => (
            <div key={index} className="iq-accom-row">
              {item.custom
                ? <input className="iq-input" aria-label={`Other ${noun}`} placeholder={isAllergy ? "e.g. Mustard" : "e.g. Kosher"} maxLength={MAX_ACCOMMODATION_LABEL} value={item.label} onChange={event => update(index, { label: event.target.value })} />
                : <span className="iq-accom-name">{item.label}</span>}
              <input className="iq-input iq-accom-count" inputMode="numeric" aria-label={`Guests needing ${item.label || `this ${noun}`}`} placeholder="Guests" value={item.raw} onChange={event => update(index, { raw: event.target.value.trim() })} />
              <button type="button" className="iq-step-btn" aria-label={`Remove ${item.label || noun}`} onClick={() => setPicked(previous => previous.filter((_, i) => i !== index))}><X size={16} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}
      {isAllergy && <p className="iq-muted">Allergies are treated as safety requirements: the kitchen reviews cross-contact for each one.</p>}
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} saveLabel="Confirm" />
    </ControlForm>
  );
}

export function StepControl({ step, ...props }: ControlProps & { step: StepKey }) {
  switch (step) {
    case "name": return <TextControl {...props} field="name" label="Demo customer name" placeholder="Synthetic name" maxLength={120} />;
    case "email": return <EmailControl {...props} />;
    case "date": return <DateControl {...props} />;
    case "time": return <TimeControl {...props} />;
    case "guests": return <GuestsControl {...props} />;
    case "service": return <ServiceControl {...props} />;
    case "address": return <TextControl {...props} field="address" label="Demo venue address" placeholder="Street, city" maxLength={250} />;
    case "allergies": return <AccommodationControl {...props} field="allergies" />;
    case "preferences": return <AccommodationControl {...props} field="preferences" />;
  }
}
