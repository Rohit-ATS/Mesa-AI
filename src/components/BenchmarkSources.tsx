import type { CompetitorBenchmark, QuoteInquiry } from "@/lib/computeQuote";

export function BenchmarkSources({ benchmarks, inquiry }: { benchmarks: CompetitorBenchmark[]; inquiry: QuoteInquiry }) {
  const applicable = benchmarks.filter(item => (item.min_guests == null || inquiry.guest_count >= item.min_guests) && (inquiry.service_style === "full_service" ? item.price_per_guest_full_service : item.price_per_guest_dropoff) != null);
  if (!applicable.length) return null;
  return <details className="mt-5 border-t border-border pt-4 text-sm"><summary className="cursor-pointer font-semibold text-secondary">Sources and limitations ({applicable.length})</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">Published menu estimates are not quotes. Delivery fees, guest minimums, and service inclusions may vary; confirm before comparing.</p><ul className="mt-3 space-y-4">{applicable.map((item,index) => <li key={`${item.business_name}-${index}`} className="text-xs leading-5 text-muted-foreground"><strong className="text-secondary">{item.business_name}</strong> · Researched {item.researched_on}{item.source_url && <> · <a className="text-primary underline" href={item.source_url} target="_blank" rel="noreferrer">Source</a></>}<br/>{item.price_notes}<br/>{item.minimum_order_notes}<br/>{item.transport_notes}</li>)}</ul></details>;
}
