import { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function QuoteReview({ inquiryId, quote }: { inquiryId: string; quote: unknown }) {
  const [review, setReview] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [reviewedQuote, setReviewedQuote] = useState("");
  const quoteSignature = JSON.stringify(quote);
  async function run() {
    setLoading(true); setError(""); setReview("");
    const { data, error: invokeError } = await supabase.functions.invoke("mesa-quote-review-3759b04e315c", { body: { inquiry_id: inquiryId, quote } });
    if (invokeError || !data?.review) setError(data?.error || "Quote review is unavailable. Please try again later.");
    else { setReview(data.review); setReviewedQuote(quoteSignature); }
    setLoading(false);
  }
  return <section className="mt-8 rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow"><Sparkles size={15}/> OWNER REVIEW</div><h2 className="mt-3 font-display text-2xl text-secondary">Review this quote</h2><p className="mt-2 text-sm text-muted-foreground">AI suggestions are advisory and use the current quote and business context. Verify the details before approval.</p></div><button onClick={run} disabled={loading} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Reviewing…" : "Review quote"}</button></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{review && reviewedQuote !== quoteSignature && <p className="mt-4 text-sm text-muted-foreground">Quote changed since the last review. Review it again for current suggestions.</p>}{review && reviewedQuote === quoteSignature && <div className="mt-5 whitespace-pre-wrap rounded-lg bg-accent p-4 text-sm leading-6 text-accent-foreground">{review}</div>}</section>;
}
