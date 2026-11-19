import { Minus, Plus, X } from "lucide-react";
import { MAX_GUESTS } from "./types";

export type DishQuantities = Record<string, number>;
const DEFAULT_PORTIONS = 10;

/** Portions for a dish: what the customer chose, otherwise the guest count, otherwise the 10-guest minimum. */
export function portionsFor(name: string, quantities: DishQuantities, guests: number | null) {
  return quantities[name] ?? guests ?? DEFAULT_PORTIONS;
}

export function clampPortions(value: number) {
  return Math.min(MAX_GUESTS, Math.max(1, Math.round(value)));
}

/** Each chosen dish with its own portion count (separate from the guest count). */
export function DishQuantityList({ chosen, quantities, guests, disabled, onChange, onRemove }: {
  chosen: string[]; quantities: DishQuantities; guests: number | null; disabled: boolean;
  onChange: (name: string, portions: number) => void; onRemove: (name: string) => void;
}) {
  if (chosen.length === 0) return <p className="iq-muted">Choose dishes from the menu.</p>;
  return (
    <ul className="iq-qty-list">
      {chosen.map(name => {
        const value = portionsFor(name, quantities, guests);
        return (
          <li key={name} className="iq-qty-row">
            <span className="iq-qty-name">{name}</span>
            <span className="iq-qty-controls">
              <button type="button" className="iq-step-btn" disabled={disabled || value <= 1} onClick={() => onChange(name, clampPortions(value - 1))} aria-label={`Fewer portions of ${name}`}><Minus size={16} aria-hidden="true" /></button>
              <input className="iq-input iq-qty-input" inputMode="numeric" disabled={disabled} aria-label={`Portions of ${name}`} value={value}
                onChange={event => { const digits = event.target.value.replace(/\D/g, ""); if (digits) onChange(name, clampPortions(Number(digits))); }} />
              <button type="button" className="iq-step-btn" disabled={disabled || value >= MAX_GUESTS} onClick={() => onChange(name, clampPortions(value + 1))} aria-label={`More portions of ${name}`}><Plus size={16} aria-hidden="true" /></button>
              <button type="button" className="iq-qty-remove" disabled={disabled} onClick={() => onRemove(name)} aria-label={`Remove ${name}`}><X size={16} aria-hidden="true" /></button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
