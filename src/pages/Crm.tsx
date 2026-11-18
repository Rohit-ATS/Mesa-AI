import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Search, UserRound } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DeclinedList, type DeclinedInquiry } from "@/components/DeclinedList";

type Customer = { id: string; name: string; email: string | null; phone: string | null; org_type: string | null; notes: string | null };
type Order = { id: string; event_date: string | null; guest_count: number | null; service_style: string | null; status: string; quote: { version: number; status: string; recommended_price: number | null }[] };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const organization = (value: string | null) => value ? value.replaceAll("_", " ") : "Not provided";

export default function Crm() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [declined, setDeclined] = useState<DeclinedInquiry[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (!active) return;
      if (authError || !auth.session) { setError("Sign in with an authorized owner account to view customers."); setLoading(false); return; }
      const { data: staff, error: staffError } = await supabase.from("mesa_staff").select("role").eq("user_id", auth.session.user.id).maybeSingle();
      if (!active) return;
      if (staffError || staff?.role !== "owner") { setError("This account does not have owner access."); setLoading(false); return; }
      const [{ data, error: customerError }, declinedResult] = await Promise.all([
        supabase.from("customer").select("id,name,email,phone,org_type,notes").order("name"),
        supabase.from("inquiry").select("id,event_date,guest_count,service_style,customer(id,name),mesa_inquiry_decision(decided_at)").eq("status", "declined").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (customerError) setError("Customers could not be loaded. Please try again.");
      else setCustomers(data || []);
      if (!declinedResult.error) setDeclined((declinedResult.data || []) as DeclinedInquiry[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    async function loadOrders() {
      setOrdersLoading(true);
      setOrders([]);
      const { data, error: orderError } = await supabase.from("inquiry").select("id,event_date,guest_count,service_style,status,quote(version,status,recommended_price)").eq("customer_id", selectedId!).order("event_date", { ascending: false, nullsFirst: false });
      if (!active) return;
      if (orderError) setError("Order history could not be loaded. Please try again.");
      else { setError(""); setOrders(data || []); }
      setOrdersLoading(false);
    }
    void loadOrders();
    return () => { active = false; };
  }, [selectedId]);

  function selectCustomer(customer: Customer) {
    setSelected(customer);
    setNotes(customer.notes || "");
    setNoteMessage("");
    setError("");
  }

  async function saveNotes() {
    if (!selected || saving) return;
    setSaving(true);
    setNoteMessage("");
    const id = selected.id;
    const { data, error: saveError } = await supabase.from("customer").update({ notes }).eq("id", id).select("id,name,email,phone,org_type,notes").maybeSingle();
    if (saveError || !data) setNoteMessage("Notes could not be saved. Please try again.");
    else {
      setCustomers(previous => previous.map(customer => customer.id === id ? data : customer));
      setSelected(previous => previous?.id === id ? data : previous);
      setNoteMessage("Notes saved.");
    }
    setSaving(false);
  }

  const query = search.trim().toLocaleLowerCase();
  const filtered = customers.filter(customer => [customer.name, customer.email, customer.phone, customer.org_type].some(value => value?.toLocaleLowerCase().includes(query)));

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link to="/owner" className="font-display text-2xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link><div className="flex items-center gap-4"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesa / Owner</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link to="/owner" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to inbox</Link>
      <div className="mt-8"><div className="eyebrow"><span className="h-px w-8 bg-primary"/> CUSTOMER RELATIONSHIPS</div><h1 className="mt-4 font-display text-4xl text-secondary sm:text-5xl">Your customers.</h1><p className="mt-3 text-muted-foreground">Fictional demo records. Contact details, notes, and past gatherings in one place.</p></div>
      {loading ? <p className="mt-10 text-muted-foreground">Loading customers…</p> : error && !selected ? <div role="status" className="mt-10 rounded-xl border border-border bg-card p-7"><p>{error}</p><Link to="/staff-login" className="mt-4 inline-block font-semibold text-primary">Staff sign in →</Link></div> : <div className="mt-10 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-display text-2xl text-secondary">Customers</h2><div className="relative mt-4"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input aria-label="Search customers" placeholder="Search customers" value={search} onChange={event => setSearch(event.target.value)} className="pl-10"/></div><div className="mt-4 space-y-1">{filtered.map(customer => <button key={customer.id} disabled={saving} onClick={() => selectCustomer(customer)} aria-pressed={selected?.id === customer.id} className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${selected?.id === customer.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}><span className="block font-semibold">{customer.name}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{organization(customer.org_type)}</span></button>)}{filtered.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">{customers.length ? "No customers match your search." : "No customers yet."}</p>}</div></section>
        {!selected ? <section className="rounded-xl border border-border bg-card p-10"><UserRound size={24} className="text-primary"/><h2 className="mt-4 font-display text-2xl text-secondary">Select a customer</h2><p className="mt-2 text-sm text-muted-foreground">Choose a customer to see their details and order history.</p></section> : <div className="space-y-6"><section className="rounded-xl border border-border bg-card p-6 sm:p-8"><div className="eyebrow">CUSTOMER PROFILE</div><h2 className="mt-3 font-display text-3xl text-secondary">{selected.name}</h2><p className="mt-2 text-sm capitalize text-muted-foreground">{organization(selected.org_type)}</p><div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Mail size={16} className="text-primary"/>{selected.email || "Email not provided"}</span><span className="flex items-center gap-2"><Phone size={16} className="text-primary"/>{selected.phone || "Phone not provided"}</span></div><div className="mt-7"><label htmlFor="customer-notes" className="text-sm font-semibold text-secondary">Notes</label><Textarea id="customer-notes" value={notes} onChange={event => { setNotes(event.target.value); setNoteMessage(""); }} placeholder="Add notes about this customer" rows={5} className="mt-2"/><div className="mt-3 flex items-center gap-4"><Button onClick={saveNotes} disabled={saving || notes === (selected.notes || "")}>{saving ? "Saving…" : "Save notes"}</Button><span role="status" className="text-sm text-muted-foreground">{noteMessage}</span></div></div></section>
        <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="p-6 sm:px-8"><div className="eyebrow">PAST & UPCOMING</div><h2 className="mt-3 font-display text-2xl text-secondary">Order history</h2></div>{error && <p role="alert" className="px-6 pb-5 text-sm text-destructive">{error}</p>}{ordersLoading ? <p className="px-6 pb-6 text-sm text-muted-foreground">Loading order history…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-4">Date</th><th className="px-4 py-4">Guests</th><th className="px-4 py-4">Service style</th><th className="px-4 py-4">Total</th><th className="px-4 py-4">Status</th></tr></thead><tbody>{orders.map(order => { const latest = [...order.quote].sort((a,b) => b.version - a.version)[0]; return <tr key={order.id} className="border-t border-border text-sm"><td className="px-6 py-4">{order.event_date || "Not set"}</td><td className="px-4 py-4">{order.guest_count ?? "—"}</td><td className="px-4 py-4 capitalize">{order.service_style?.replaceAll("_", " ") || "Not set"}</td><td className="px-4 py-4">{latest?.recommended_price == null ? "—" : money(latest.recommended_price)}</td><td className="px-4 py-4 capitalize">{order.status.replaceAll("_", " ")}</td></tr>; })}</tbody></table>{!orders.length && !error && <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>}</div>}</section></div>}
      </div>}
      {!loading && !(error && !selected) && <DeclinedList items={declined} onSelectCustomer={id => { const customer = customers.find(c => c.id === id); if (customer) { selectCustomer(customer); window.scrollTo({ top: 0, behavior: "smooth" }); } }} />}
    </div>
  </main>;
}
