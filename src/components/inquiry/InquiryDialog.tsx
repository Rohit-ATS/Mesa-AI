import { useEffect } from "react";
import { portionsFor, type DishQuantities } from "./DishQuantities";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { InquiryChat } from "./InquiryChat";
import { RequestCard } from "./RequestCard";
import { ReviewPanel } from "./ReviewPanel";
import { capturedCount, dishLabel, missingLabels, STEPS } from "./types";
import { useInquiryDraft } from "./useInquiryDraft";
import { useIntakeAgent } from "./useIntakeAgent";

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; chosen: string[]; onToggleDish: (name: string) => void;
  quantities: DishQuantities; onQuantity: (name: string, portions: number) => void; onGuests: (guests: number | null) => void;
};

export function InquiryDialog({ open, onOpenChange, chosen, onToggleDish, quantities, onQuantity, onGuests }: Props) {
  const agent = useIntakeAgent();
  const draft = useInquiryDraft();
  const { prepare, ensureReady } = agent;
  const reviewing = draft.view === "review";
  const saved = draft.status === "saved";
  const missing = missingLabels(draft.details, chosen.length);
  const count = capturedCount(draft.details);

  useEffect(() => { if (open) prepare(); }, [open, prepare]);
  useEffect(() => { onGuests(draft.details.guests); }, [draft.details.guests, onGuests]);

  function addDishes() {
    onOpenChange(false);
    window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }), 150);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="intake-dialog max-h-[92vh] max-w-6xl gap-0 overflow-y-auto p-0 sm:rounded-[.3rem]">
        <DialogTitle className="sr-only">Plan your gathering</DialogTitle>
        <DialogDescription className="sr-only">Answer a few quick questions, review your request and submit a demo inquiry.</DialogDescription>
        <div className="iq">
          <div className="iq-head">
            <div>
              <div className="iq-eyebrow">LET’S MAKE IT A GATHERING</div>
              <h2>Pull up a <em>chair.</em></h2>
            </div>
            <p>Tell us a little about what you’re planning. We’ll start with the details.</p>
          </div>
          <div className="iq-grid">
            {reviewing ? (
              <ReviewPanel details={draft.details} chosen={chosen} quantities={quantities} missing={missing} status={draft.status} error={draft.submitError}
                onEdit={draft.edit} onRemoveDish={onToggleDish} onQuantity={onQuantity} onAddDishes={addDishes} onBack={draft.closeReview}
                onSubmit={() => void draft.submit(chosen, Object.fromEntries(chosen.map(name => [name, portionsFor(name, quantities, draft.details.guests)])), ensureReady)} />
            ) : (
              <InquiryChat draft={draft} agent={agent} />
            )}
            <RequestCard details={draft.details} chosen={chosen} quantities={quantities} locked={draft.locked} saved={saved} reviewing={reviewing}
              onRemoveDish={onToggleDish} onQuantity={onQuantity} onEdit={draft.edit} onReview={draft.openReview} />
          </div>
        </div>
        {!reviewing && (
          <div className="iq-mobilebar">
            <span><span className="landing-badge" aria-hidden="true">{chosen.length}</span> {dishLabel(chosen.length).replace(/^\d+ /, "")} · {count} of {STEPS.length} details</span>
            <button type="button" className="iq-btn iq-primary" onClick={draft.openReview}>Review</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
