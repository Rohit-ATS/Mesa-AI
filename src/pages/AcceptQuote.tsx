import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Line = { key: string; kind: string; label: string; qty?: number; unit?: string; unit_price?: number; amount: number | null; note?: string | null };
type Quote = {
  state: "open" | "accepted" | "superseded" | "cancelled" | "declined" | "not_found"; version?: number; latest_version?: number; lines?: Line[]; subtotal?: number; tax_amount?: number | null; total?: number;
  accepted_at?: string | null; released?: boolean; customer_name?: string;
  event?: { date: string | null; time: string | null; guests: number | null; service_style: string | null; venue_address: string | null };
  accommodations?: { kind: string; label: string; guests: number }[];
};
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const styles: Record<string, string> = { dropoff: "Drop-off", setup: "Drop-off with setup", full_service: "Full service" };
const closedText: Record<string, { title: string; body: string }> = {
  superseded: { title: "A newer quote replaced this one", body: "We've sent you an updated quote. Please use the Accept button in the most recent email." },
  cancelled: { title: "This quote is no longer open", body: "The kitchen withdrew this quote. Reply to our email if you have questions." },
  declined: { title: "This request is closed", body: "We're unable to cater this event. Reply to our email if you have questions." },
  not_found: { title: "Quote not found", body: "This link isn't valid. Please use the Accept button in your quote email." },
};

export default function AcceptQuote() {
  const { token = "" } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.rpc("mesa_customer_quote", { p_token: token }).then(({ data, error: loadError }) => {
      if (!alive) return;
      if (loadError) setError("We couldn't load your quote. Please try again in a moment.");
      else setQuote(data as unknown as Quote);
    });
    return () => { alive = false; };
  }, [token]);

  async function accept() {
    if (busy) return;
    setBusy(true); setError("");
    const { data, error: acceptError } = await supabase.rpc("mesa_accept_quote", { p_token: token });
    setBusy(false);
    if (acceptError) { setError("Your acceptance could not be recorded. Please try again."); return; }
    const result = data as unknown as Quote;
    setQuote(previous => result.state === "accepted" && previous ? { ...previous, state: "accepted", accepted_at: result.accepted_at } : { ...result });
  }

  const taxLine = quote?.lines?.find(l => l.kind === "tax");
  const items = quote?.lines?.filter(l => l.kind !== "tax") ?? [];
  const taxPending = !!taxLine && quote?.tax_amount == null;
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="font-display text-2xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link>
        {!quote && !error && <p className="mt-12 text-muted-foreground">Loading your quote…</p>}
        {error && !quote && <p role="alert" className="mt-12 rounded-xl border border-destructive bg-card p-6 text-destructive">{error}</p>}
        {quote && closedText[quote.state] && (
          <section className="mt-12 rounded-xl border border-border bg-card p-8">
            <AlertTriangle className="text-primary" />
            <h1 className="mt-4 font-display text-3xl text-secondary">{closedText[quote.state].title}</h1>
            <p className="mt-3 text-muted-foreground">{closedText[quote.state].body}</p>
            {quote.state === "superseded" && quote.version && <p className="mt-2 text-sm text-muted-foreground">This link was for quote v{quote.version}; the latest is v{quote.latest_version}.</p>}
          </section>
        )}
        {quote && (quote.state === "open" || quote.state === "accepted") && quote.lines && (
          <>
            <div className="mt-10 eyebrow">YOUR CATERING QUOTE · V{quote.version}</div>
            <h1 className="mt-3 font-display text-4xl text-secondary">{quote.customer_name ? `Hi ${quote.customer_name},` : "Your quote"}</h1>
            {quote.event && (
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                <span className="flex items-center gap-2"><Clock3 size={17} />{quote.event.date ? new Date(`${quote.event.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date to confirm"}{quote.event.time ? ` at ${quote.event.time.slice(0, 5)}` : ""}</span>
                <span className="flex items-center gap-2"><UsersRound size={17} />{quote.event.guests} guests · {styles[quote.event.service_style ?? ""] ?? quote.event.service_style}</span>
                <span className="flex items-center gap-2"><MapPin size={17} />{quote.event.venue_address}</span>
              </div>
            )}
            <section className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Item</th><th className="p-4">Quantity</th><th className="p-4 text-right">Amount</th></tr></thead>
                <tbody>
                  {items.map(line => (
                    <tr key={line.key} className="border-t border-border">
                      <td className="p-4 font-semibold text-secondary">{line.label}{line.kind === "optional" && <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>}{line.note && <span className="mt-1 block text-xs font-normal text-muted-foreground">{line.note}</span>}</td>
                      <td className="p-4 text-muted-foreground">{line.qty} {line.unit} × {money(line.unit_price ?? 0)}</td>
                      <td className="p-4 text-right text-secondary">{money(line.amount ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border"><td colSpan={2} className="p-4 font-semibold text-secondary">Subtotal</td><td className="p-4 text-right font-semibold text-secondary">{money(quote.subtotal ?? 0)}</td></tr>
                  {taxLine && <tr className="border-t border-border"><td colSpan={2} className="p-4 text-secondary">{taxPending ? "Tax: pending — will be confirmed before your event" : taxLine.label}</td><td className="p-4 text-right text-secondary">{taxPending ? "Pending" : money(quote.tax_amount ?? 0)}</td></tr>}
                  <tr className="border-t border-border bg-accent/50"><td colSpan={2} className="p-4 font-display text-lg text-secondary">{taxPending ? "Total before tax" : "Total"}</td><td className="p-4 text-right font-display text-2xl text-secondary">{money(quote.total ?? 0)}</td></tr>
                </tbody>
              </table>
            </section>
            {!!quote.accommodations?.length && (
              <section className="mt-6 rounded-xl border border-border bg-card p-5 text-sm">
                <h2 className="font-semibold text-secondary">Allergies & preferences we're planning for</h2>
                <ul className="mt-2 space-y-1 text-muted-foreground">{quote.accommodations.map(a => <li key={`${a.kind}-${a.label}`}>{a.kind === "allergy" ? "Allergy" : "Preference"}: {a.label} — {a.guests} guests</li>)}</ul>
              </section>
            )}
            {quote.state === "accepted" ? (
              <section className="mt-8 rounded-xl bg-secondary p-6 text-secondary-foreground">
                <p className="flex items-center gap-2 font-display text-2xl"><CheckCircle2 /> Quote accepted</p>
                <p className="mt-2 text-secondary-foreground/80">{quote.accepted_at ? `Accepted ${new Date(quote.accepted_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. ` : ""}{quote.released ? "Your order is confirmed and on our kitchen schedule." : "We'll confirm the kitchen schedule and email you a confirmation."}</p>
              </section>
            ) : (
              <section className="mt-8">
                <button onClick={accept} disabled={busy} className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto">{busy ? "Recording…" : "Accept this quote"}</button>
                <p className="mt-3 text-sm text-muted-foreground">Accepting tells us to go ahead with quote v{quote.version}. Your order is confirmed once we release it to the kitchen and email you. No payment is taken here.</p>
              </section>
            )}
            {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
