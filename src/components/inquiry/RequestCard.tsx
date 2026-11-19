import { Check, X } from "lucide-react";
import { DishQuantityList, type DishQuantities } from "./DishQuantities";
import { STEPS, capturedCount, dishLabel, displayValue, isCaptured, type Details, type StepKey } from "./types";

export const SAVED_MESSAGE = "Request received. You'll receive a quote by email to review and accept. Your order is confirmed only after you accept and we release it to the kitchen.";

export function DishChips({ chosen, onRemove, disabled }: { chosen: string[]; onRemove: (name: string) => void; disabled: boolean }) {
  if (chosen.length === 0) return <p className="iq-muted">Choose dishes from the menu.</p>;
  return (
    <ul className="iq-dish-chips">
      {chosen.map(name => (
        <li key={name}>
          <button type="button" className="iq-dish-chip" disabled={disabled} onClick={() => onRemove(name)} aria-label={`Remove ${name}`}>
            <span>{name}</span><X size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DetailRows({ details, locked, onEdit }: { details: Details; locked: boolean; onEdit: (key: StepKey) => void }) {
  return (
    <dl className="iq-fields">
      {STEPS.map(step => {
        const captured = isCaptured(details, step.key);
        return (
          <div key={step.key} className="iq-field">
            <dt>{step.label}</dt>
            <dd className={captured ? "iq-got" : "iq-need"}>
              {captured ? <><Check size={16} aria-hidden="true" /><span>{displayValue(details, step.key)}</span></> : "Still needed"}
            </dd>
            {!locked && (
              <button type="button" className="iq-link" onClick={() => onEdit(step.key)} aria-label={`${captured ? "Edit" : "Add"} ${step.label.toLowerCase()}`}>
                {captured ? "Edit" : "Add"}
              </button>
            )}
          </div>
        );
      })}
    </dl>
  );
}

export function RequestCard({ details, chosen, quantities, locked, saved, reviewing, onRemoveDish, onQuantity, onEdit, onReview }: {
  details: Details; chosen: string[]; quantities: DishQuantities; locked: boolean; saved: boolean; reviewing: boolean;
  onRemoveDish: (name: string) => void; onQuantity: (name: string, portions: number) => void; onEdit: (key: StepKey) => void; onReview: () => void;
}) {
  const count = capturedCount(details);
  return (
    <aside className="iq-panel iq-card" aria-label="Your request so far">
      <div className="iq-eyebrow">THE DETAILS</div>
      <h3 className="iq-card-title">Your request <em>so far.</em></h3>
      <div className="iq-dishes">
        <div className="iq-label-row"><span className="iq-label">Dishes</span><span className="landing-badge" aria-label={dishLabel(chosen.length)}>{chosen.length}</span></div>
        <DishQuantityList chosen={chosen} quantities={quantities} guests={details.guests} disabled={locked} onChange={onQuantity} onRemove={onRemoveDish} />
        {chosen.length > 0 && <p className="iq-muted">Portions per dish are separate from your guest count.</p>}
      </div>
      <div className="iq-progress-wrap">
        <div className="iq-progress" role="progressbar" aria-label="Details captured" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={count} aria-valuetext={`${count} of ${STEPS.length} details`}>
          <span style={{ width: `${(count / STEPS.length) * 100}%` }} />
        </div>
        <p className="iq-progress-label">{count} of {STEPS.length} details</p>
      </div>
      <DetailRows details={details} locked={locked} onEdit={onEdit} />
      {saved && <p role="status" className="iq-success"><Check size={16} aria-hidden="true" />{SAVED_MESSAGE}</p>}
      {!reviewing && <button type="button" className="iq-btn iq-primary iq-block" onClick={onReview}>{saved ? "View your request" : "Review and confirm"}</button>}
    </aside>
  );
}
