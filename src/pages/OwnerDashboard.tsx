import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, ClipboardList, DollarSign, Inbox, UsersRound } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { EventCalendar } from "@/components/EventCalendar";
import { AvgGuestsChart, BreakdownChart, ChartCard, RequestsChart } from "@/components/dashboard/Charts";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentStaff } from "@/lib/staffAuth";
import { approvedEvents, customerProfile, stageCounts, summary, trend, type DashInquiry, type Grain } from "@/lib/dashboardStats";
import { stageLabel, type Stage } from "@/lib/workflowStage";

const STAGES: { key: Stage; filter: string; note: string }[] = [
  { key: "needs_approval", filter: "needs_approval", note: "Owner to approve quote" },
  { key: "quote_sent", filter: "quote_sent", note: "Waiting for customer" },
  { key: "ready_to_release", filter: "ready_to_release", note: "Customer accepted" },
  { key: "released", filter: "in_preparation", note: "On the kitchen board" },
  { key: "declined", filter: "declined", note: "In CRM declined list" },
];
import { useMesaLiveUpdates } from "@/hooks/useMesaLiveUpdates";

const usd = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DashInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [grain, setGrain] = useState<Grain>("week");
  const [revision, setRevision] = useState(0);
  const liveStatus = useMesaLiveUpdates(authorized, () => setRevision(v => v + 1));

  useEffect(() => {
    let active = true;
    (async () => {
      const { role } = await getCurrentStaff();
      if (!active) return;
      if (role !== "owner") { setMessage(role ? "This account does not have owner access." : "Sign in with an owner account to view the dashboard."); setLoading(false); return; }
      setAuthorized(true);
      const { data, error } = await supabase.from("inquiry").select("id,created_at,status,guest_count,event_date,event_time,service_style,customer(id,name,org_type),order_line(qty_servings,menu_item(name_es)),kitchen_checklist(item_key,done),quote(recommended_price,version,status),mesa_quote_version(version,status,accepted_at)").order("created_at");
      if (!active) return;
      if (error) setMessage("The dashboard could not be loaded. Please try again.");
      else { setMessage(""); setRows((data || []) as unknown as DashInquiry[]); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [revision]);

  const stats = useMemo(() => summary(rows), [rows]);
  const stages = useMemo(() => stageCounts(rows), [rows]);
  const series = useMemo(() => trend(rows, grain), [rows, grain]);
  const profile = useMemo(() => customerProfile(rows), [rows]);
  const events = useMemo(() => approvedEvents(rows), [rows]);
  const kpis = [
    { label: "Total requests", value: String(stats.total), note: `${stats.pending} awaiting your decision`, icon: Inbox },
    { label: "Approval rate", value: stats.approvalRate == null ? "—" : `${Math.round(stats.approvalRate * 100)}%`, note: `${stats.approved} approved of decided requests`, icon: CalendarCheck2 },
    { label: "Avg guests / request", value: stats.avgGuests == null ? "—" : String(Math.round(stats.avgGuests)), note: "Across all requests with a guest count", icon: UsersRound },
    { label: "Approved value", value: usd(stats.revenue), note: "Sum of approved quote prices", icon: DollarSign },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link to="/" className="font-display text-2xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link><div className="flex items-center gap-4"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesa / Owner</span><SignOutButton /></div></div></header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/owner" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to inbox</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><div className="eyebrow"><span className="h-px w-8 bg-primary" /> OWNER DASHBOARD</div><h1 className="mt-4 font-display text-4xl text-secondary sm:text-5xl">How the business is moving.</h1><p className="mt-3 text-muted-foreground">Requests, guests, customers and upcoming events. Includes demo data.</p></div>
          {authorized && <p role="status" className="text-xs text-muted-foreground">{liveStatus === "live" ? "Live updates connected" : liveStatus === "offline" ? "Live updates disconnected" : "Connecting live updates…"}</p>}
        </div>
        {loading ? <p className="mt-10 text-muted-foreground">Loading dashboard…</p> : message ? (
          <div role="status" className="mt-10 rounded-xl border border-border bg-card p-8"><p>{message}</p><Link to="/staff-login" className="mt-4 inline-block font-semibold text-primary">Go to staff sign in →</Link></div>
        ) : <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{kpis.map(k => (
            <article key={k.label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{k.label}</span><k.icon size={18} className="text-primary" /></div><div className="mt-4 font-display text-3xl text-secondary">{k.value}</div><p className="mt-2 text-xs text-muted-foreground">{k.note}</p></article>
          ))}</div>

          <section className="mt-8 rounded-xl border border-border bg-card p-5">
            <h2 className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Pipeline by stage</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">{STAGES.map(s => (
              <Link key={s.key} to={`/owner?filter=${s.filter}`} className="rounded-lg bg-accent/50 p-4 transition hover:bg-accent"><div className="font-display text-3xl text-secondary">{stages[s.key]}</div><div className="mt-1 text-sm font-semibold text-secondary">{stageLabel[s.key]}</div><div className="text-xs text-muted-foreground">{s.note}</div></Link>
            ))}</div>
          </section>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl text-secondary">Trends</h2>
            <div role="tablist" aria-label="Time grouping" className="flex rounded-full border border-border bg-card p-1">{(["week", "month"] as Grain[]).map(g => <button key={g} role="tab" aria-selected={grain === g} onClick={() => setGrain(g)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${grain === g ? "bg-secondary text-secondary-foreground" : "text-secondary"}`}>{g === "week" ? "Weekly" : "Monthly"}</button>)}</div>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Requests over time" note={`By date the request came in · last ${grain === "week" ? "12 weeks" : "6 months"}`}><RequestsChart data={series} /></ChartCard>
            <ChartCard title="Average guests per request" note="Mean guest count of requests received in each period"><AvgGuestsChart data={series} /></ChartCard>
          </div>

          <h2 className="mt-10 flex items-center gap-2 font-display text-2xl text-secondary"><ClipboardList size={20} className="text-primary" /> Customer profile</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ChartCard title="Customer type" note="Unique customers by organisation type"><BreakdownChart data={profile.orgTypes} /></ChartCard>
            <ChartCard title="Party size" note="Requests by guest count"><BreakdownChart data={profile.partySizes} /></ChartCard>
            <ChartCard title="Service style" note="Requests by service style"><BreakdownChart data={profile.serviceStyles} /></ChartCard>
            <ChartCard title="Most requested dishes" note="Times each dish appeared in a request" className="lg:col-span-2"><BreakdownChart data={profile.topDishes} /></ChartCard>
            <ChartCard title="Repeat customers" note="Customers with more than one request">
              <div className="flex items-end gap-6"><div><div className="font-display text-4xl text-secondary">{profile.repeat.repeat}</div><p className="text-xs text-muted-foreground">Repeat</p></div><div><div className="font-display text-4xl text-muted-foreground">{profile.repeat.single}</div><p className="text-xs text-muted-foreground">One-time</p></div></div>
              <p className="mt-4 text-xs text-muted-foreground">Each intake submission currently creates a new customer record, so repeat bookings are only counted when linked in CRM.</p>
            </ChartCard>
          </div>

          <div className="mt-10"><EventCalendar title="Upcoming events" events={events} onSelect={id => navigate(`/owner?inquiry=${id}`)} /></div>
        </>}
      </div>
    </main>
  );
}
