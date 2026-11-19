import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sessionKey } from "./useIntakeAgent";
import { STEPS, emptyDetails, isCaptured, missingLabels, type Details, type StepKey } from "./types";

export type DraftStatus = "idle" | "saving" | "saved";
export type DraftView = "chat" | "review";

export function useInquiryDraft() {
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [editing, setEditing] = useState<StepKey | null>(null);
  const [edited, setEdited] = useState<StepKey[]>([]);
  const [view, setView] = useState<DraftView>("chat");
  const [interacted, setInteracted] = useState(false);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);

  const captured = useMemo(() => STEPS.filter(step => isCaptured(details, step.key)).map(step => step.key), [details]);
  const firstMissing = STEPS.find(step => !captured.includes(step.key))?.key ?? null;
  const active = editing ?? firstMissing;
  const locked = status !== "idle";

  const setValue = useCallback(<K extends StepKey>(key: K, value: Details[K]) => {
    if (status !== "idle") return;
    setDetails(previous => ({ ...previous, [key]: value }));
    setEdited(previous => (captured.includes(key) && !previous.includes(key) ? [...previous, key] : previous));
    setEditing(null);
    setInteracted(true);
    setSubmitError("");
  }, [captured, status]);

  const edit = useCallback((key: StepKey) => {
    if (status !== "idle") return;
    setEditing(key);
    setView("chat");
    setInteracted(true);
  }, [status]);

  const cancelEdit = useCallback(() => setEditing(null), []);
  const openReview = useCallback(() => { setView("review"); setEditing(null); }, []);
  const closeReview = useCallback(() => setView("chat"), []);

  const submit = useCallback(async (dishes: string[], portions: Record<string, number>, ensureReady: () => Promise<unknown>) => {
    if (submitting.current || status !== "idle") return;
    const missing = missingLabels(details, dishes.length);
    if (missing.length > 0) { setSubmitError(`Still needed: ${missing.join(", ")}.`); return; }
    submitting.current = true;
    setStatus("saving");
    setSubmitError("");
    try {
      await ensureReady();
      const session = sessionStorage.getItem(sessionKey);
      if (!session) throw new Error("Could not start your conversation. Please try again.");
      const { data: inquiryId, error } = await supabase.rpc("mesa_submit_demo_inquiry", {
        p_session: session,
        p_details: {
          name: details.name.trim(),
          email: details.email.trim(),
          date: details.date,
          time: details.time,
          guests: details.guests,
          service: details.service,
          address: details.address.trim(),
          allergies: details.allergies,
          preferences: details.preferences,
          dish_quantities: portions,
        },
        p_dishes: dishes,
      });
      if (error) throw new Error(error.message);
      setStatus("saved");
      // Start research, quote calculation, proposal draft and owner email in the background.
      // The inquiry is already saved, so a failure here must not be reported as a failed submission.
      if (inquiryId) void supabase.functions.invoke("mesa-auto-proposal-3759b04e315c", { body: { inquiry_id: inquiryId, session } });
    } catch (err) {
      setStatus("idle");
      setSubmitError(`Could not save your request: ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      submitting.current = false;
    }
  }, [details, status]);

  return { details, editing, edited, view, interacted, status, submitError, active, locked, setValue, edit, cancelEdit, openReview, closeReview, submit };
}

export type InquiryDraft = ReturnType<typeof useInquiryDraft>;
