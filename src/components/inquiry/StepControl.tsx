import { useId, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Check, Minus, Plus } from "lucide-react";
import {
  DIETARY_CHIPS, MAX_DIETARY_LENGTH, MAX_GUESTS, NONE_CHIP, SERVICES, dietaryText, todayString,
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
    setRaw(String(Math.min(MAX_GUESTS, Math.max(1, current + delta))));
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < 1 || value > MAX_GUESTS) { setError("Enter a whole number from 1 to 10,000."); return; }
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

function DietaryControl({ details, onSave, onCancel, autoFocus }: ControlProps) {
  const id = useId();
  const [chips, setChips] = useState<string[]>(details.dietary?.chips ?? []);
  const [otherOn, setOtherOn] = useState(!!details.dietary?.other);
  const [otherText, setOtherText] = useState(details.dietary?.other ?? "");
  const [error, setError] = useState("");

  function toggleChip(chip: string) {
    setError("");
    if (chip === NONE_CHIP) {
      const turningOn = !chips.includes(NONE_CHIP);
      setChips(turningOn ? [NONE_CHIP] : []);
      if (turningOn) { setOtherOn(false); setOtherText(""); }
      return;
    }
    const rest = chips.filter(item => item !== NONE_CHIP);
    setChips(rest.includes(chip) ? rest.filter(item => item !== chip) : [...rest, chip]);
  }
  function toggleOther() {
    setError("");
    if (!otherOn) setChips(chips.filter(item => item !== NONE_CHIP));
    setOtherOn(!otherOn);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const other = otherOn ? otherText.trim() : "";
    if (otherOn && !other) { setError("Describe the other dietary need, or turn off Other."); return; }
    if (chips.length === 0 && !other) { setError("Choose at least one option, or None."); return; }
    const dietary = { chips, other };
    if (dietaryText(dietary).length > MAX_DIETARY_LENGTH) { setError("Please keep dietary needs under 250 characters."); return; }
    onSave("dietary", dietary);
  }
  return (
    <ControlForm onSubmit={submit}>
      <span className="iq-label" id={`${id}-label`}>Dietary needs</span>
      <div className="iq-chips" role="group" aria-labelledby={`${id}-label`}>
        {DIETARY_CHIPS.map((chip, index) => (
          <button key={chip} type="button" className="iq-chip" aria-pressed={chips.includes(chip)} autoFocus={autoFocus && index === 0}
            onClick={() => toggleChip(chip)}>{chips.includes(chip) && <Check size={16} aria-hidden="true" />}{chip}</button>
        ))}
        <button type="button" className="iq-chip" aria-pressed={otherOn} onClick={toggleOther}>{otherOn && <Check size={16} aria-hidden="true" />}Other</button>
      </div>
      {otherOn && (
        <>
          <label htmlFor={`${id}-other`} className="iq-label">Other dietary need</label>
          <input id={`${id}-other`} className="iq-input" value={otherText} maxLength={MAX_DIETARY_LENGTH} placeholder="For example: shellfish allergy" autoFocus
            onChange={event => { setOtherText(event.target.value); setError(""); }} />
        </>
      )}
      <FieldError id={`${id}-error`} message={error} />
      <Actions onCancel={onCancel} saveLabel="Confirm" />
    </ControlForm>
  );
}

export function StepControl({ step, ...props }: ControlProps & { step: StepKey }) {
  switch (step) {
    case "name": return <TextControl {...props} field="name" label="Demo customer name" placeholder="Synthetic name" maxLength={120} />;
    case "date": return <DateControl {...props} />;
    case "time": return <TimeControl {...props} />;
    case "guests": return <GuestsControl {...props} />;
    case "service": return <ServiceControl {...props} />;
    case "address": return <TextControl {...props} field="address" label="Demo venue address" placeholder="Street, city" maxLength={250} />;
    case "dietary": return <DietaryControl {...props} />;
  }
}
