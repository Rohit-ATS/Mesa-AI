import { AlertCircle, ArrowLeft, Check } from "lucide-react";
import { DetailRows, DishChips, SAVED_MESSAGE } from "./RequestCard";
import type { Details, StepKey } from "./types";
import type { DraftStatus } from "./useInquiryDraft";
import { dishLabel } from "./types";

export function ReviewPanel({ details, chosen, missing, status, error, onEdit, onRemoveDish, onAddDishes, onBack, onSubmit }: {
  details: Details; chosen: string[]; missing: string[]; status: DraftStatus; error: string;
  onEdit: (key: StepKey) => void; onRemoveDish: (name: string) => void; onAddDishes: () => void; onBack: () => void; onSubmit: () => void;
}) {
  const locked = status !== "idle";
  const blocked = missing.length > 0;
  return (
    <section className="iq-panel iq-review" aria-labelledby="iq-review-title">
      <div className="iq-chat-head">
        <h3 id="iq-review-title">Review and confirm</h3>
        <p>Check everything below. Nothing is saved until you submit.</p>
      </div>
      <div className="iq-review-body">
        <DetailRows details={details} locked={locked} onEdit={onEdit} />
        <div className="iq-dishes">
          <div className="iq-label-row"><span className="iq-label">Dishes ({dishLabel(chosen.length)})</span></div>
          <DishChips chosen={chosen} onRemove={onRemoveDish} disabled={locked} />
          {!locked && <button type="button" className="iq-link iq-link-left" onClick={onAddDishes}>{chosen.length ? "Add more dishes from the menu" : "Choose dishes from the menu"}</button>}
        </div>
        <p className="iq-muted">Demo only. Synthetic information is used, no prices are shown, and no email or payment is sent.</p>
        {status === "saved" && <p role="status" className="iq-success"><Check size={16} aria-hidden="true" />{SAVED_MESSAGE}</p>}
        {error && <p role="alert" className="iq-error"><AlertCircle size={16} aria-hidden="true" /><span>{error}</span></p>}
        {blocked && !locked && <p id="iq-missing" className="iq-missing">Still needed: {missing.join(", ")}.</p>}
        <div className="iq-actions">
          <button type="button" className="iq-btn iq-primary" onClick={onSubmit} disabled={blocked || locked} aria-describedby={blocked ? "iq-missing" : undefined}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Submit demo inquiry"}
          </button>
          <button type="button" className="iq-btn iq-secondary" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to chat</button>
        </div>
      </div>
    </section>
  );
}
