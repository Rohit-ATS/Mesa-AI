import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BarChart3, Clock3, ClipboardCheck, MessageSquare, TrendingUp } from "lucide-react";
import { checklistFromRows, prepClass, prepLabel, prepState, todayLA, type PrepState } from "@/lib/prepStatus";
import SignOutButton from "@/components/SignOutButton";
import { supabase } from "@/integrations/supabase/client";
import Owner from "./Owner";
import { useMesaLiveUpdates } from "@/hooks/useMesaLiveUpdates";
import { customerAccepted, stageDetail, workflowStage, type VersionRow } from "@/lib/workflowStage";

type Metrics = { median_hours: number | null; approval_count: number; avg_clarifications: number | null; clarification_count: number; total_inquiries: number; handoff_complete: number; approved_count: number; upsell_total: number | null; upsell_recorded_count: number; period_count: number; synthetic_count: number; period: string };
type InboxItem = { id: string; status: string; guest_count: number | null; event_date: string | null; completeness_score: number | null; customer: { name: string } | null; inquiry_metrics_context: { synthetic_demo: boolean } | null; quote: { margin_pct: number | null; version: number }[]; kitchen_checklist: { item_key: string; done: boolean }[]; mesa_quote_version: VersionRow[] };
type Filter = "all" | "needs_approval" | "quote_sent" | "customer_accepted" | "ready_to_release" | "in_preparation" | "prepared" | "past" | "declined";
const filters: { key: Filter; label: string }[] = [{ key:"all", label:"All" },{ key:"needs_approval", label:"Needs approval" },{ key:"quote_sent", label:"Quote sent" },{ key:"customer_accepted", label:"Customer accepted" },{ key:"ready_to_release", label:"Ready to release" },{ key:"in_preparation", label:"In preparation" },{ key:"prepared", label:"Prepared" },{ key:"past", label:"Past events" },{ key:"declined", label:"Declined" }];
function classify(item: InboxItem, today: string): { filters: Exclude<Filter,"all">[]; prep: PrepState | null } {
 const stage = workflowStage(item.status, item.mesa_quote_version);
 const accepted: Exclude<Filter,"all">[] = customerAccepted(item.mesa_quote_version) ? ["customer_accepted"] : [];
 if (stage === "declined") return { filters:["declined"], prep:null };
 if (stage === "needs_approval") return { filters:["needs_approval"], prep:null };
 if (stage === "quote_sent") return { filters:["quote_sent"], prep:null };
 if (stage === "ready_to_release") return { filters:["ready_to_release", ...accepted], prep:null };
 const prep = prepState(checklistFromRows(item.kitchen_checklist));
 if (item.event_date && item.event_date < today) return { filters:["past", ...accepted], prep };
 return { filters:[prep === "prepared" ? "prepared" : "in_preparation", ...accepted], prep };
}
const usd = (value: number) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(value);
const metricLabel = "Handoff requires event date and time, delivery location, service style, guest count, confirmed dietary information, dishes with servings and recipes, and scheduled prep tasks.";

export default function OwnerInbox() {
 const [params] = useSearchParams(); const [metrics,setMetrics] = useState<Metrics | null>(null); const [items,setItems] = useState<InboxItem[]>([]); const [message,setMessage] = useState(""); const [loading,setLoading] = useState(true);
 const [authorized,setAuthorized] = useState(false); const [revision,setRevision] = useState(0);
 const [filter,setFilter] = useState<Filter>(() => (filters.some(f => f.key === params.get("filter")) ? params.get("filter") as Filter : "all"));
 const liveStatus = useMesaLiveUpdates(authorized && !params.has("inquiry"), () => setRevision(value => value + 1));
 useEffect(() => { let active = true; async function load() {
  if (params.has("inquiry")) { setLoading(false); return; }
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (!active) return;
  if (authError || !auth.session) { setAuthorized(false); setMessage("Sign in with an authorized owner account to view the inbox."); setLoading(false); return; }
  const { data: staff, error: staffError } = await supabase.from("mesa_staff").select("role").eq("user_id",auth.session.user.id).maybeSingle();
  if (!active) return;
  if (staffError || staff?.role !== "owner") { setAuthorized(false); setMessage("This account does not have owner access."); setLoading(false); return; }
  setAuthorized(true);
  const sessionId = auth.session.access_token.split(".")[1];
  let sessionStart: string | null = null;
  try { const payload = JSON.parse(atob(sessionId.replaceAll("-", "+").replaceAll("_", "/"))); const key = `mesa-session-start:${payload.session_id}`; sessionStart = localStorage.getItem(key); if (!sessionStart) { sessionStart = new Date().toISOString(); localStorage.setItem(key, sessionStart); } } catch { sessionStart = null; }
  const [metricResult, inboxResult] = await Promise.all([sessionStart ? supabase.rpc("mesa_owner_session_metrics", { p_since: sessionStart }) : Promise.resolve({data:null,error:null}), supabase.from("inquiry").select("id,status,guest_count,event_date,completeness_score,customer(name),inquiry_metrics_context(synthetic_demo),quote(margin_pct,version),kitchen_checklist(item_key,done),mesa_quote_version(version,status,accepted_at)").order("created_at",{ascending:false})]);
  if (!active) return;
  if (metricResult.error || inboxResult.error) setMessage("Unable to load the inbox and metrics. Please try again.");
  else { setMessage(""); setMetrics(metricResult.data as unknown as Metrics); setItems((inboxResult.data || []) as InboxItem[]); }
  setLoading(false);
 } void load(); return () => { active = false; }; }, [params, revision]);
 if (params.has("inquiry")) return <Owner/>;
 const today = todayLA();
 const classified = items.map(item => ({ item, ...classify(item, today) }));
 const counts = Object.fromEntries(filters.map(f => [f.key, f.key === "all" ? items.length : classified.filter(c => c.filters.includes(f.key as Exclude<Filter,"all">)).length])) as Record<Filter, number>;
 const visible = filter === "all" ? classified : classified.filter(c => c.filters.includes(filter as Exclude<Filter,"all">));
 const cards = metrics ? [
  { label:"Median approval time", value: metrics.median_hours == null ? "—" : `${Number(metrics.median_hours).toFixed(1)} hr`, note:`${metrics.approval_count} approved proposals · this session`, icon:Clock3 },
  { label:"Clarification rounds", value: metrics.avg_clarifications == null ? "—" : Number(metrics.avg_clarifications).toFixed(1), note:`${metrics.clarification_count} of ${metrics.total_inquiries} inquiries recorded · this session`, icon:MessageSquare },
  { label:"Kitchen handoff", value: metrics.approved_count ? `${Math.round(metrics.handoff_complete / metrics.approved_count * 100)}%` : "—", note:`${metrics.handoff_complete} of ${metrics.approved_count} approved · all time`, icon:ClipboardCheck },
  { label:"Upsell value", value: metrics.upsell_total == null ? "—" : usd(metrics.upsell_total), note:`${metrics.period.trim()} · ${metrics.upsell_recorded_count} of ${metrics.period_count} recorded`, icon:TrendingUp },
 ] : [];
 return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link to="/" className="font-display text-2xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link><div className="flex items-center gap-4"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesa / Owner</span><SignOutButton /></div></div></header><div className="mx-auto max-w-7xl px-6 py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow"><span className="h-px w-8 bg-primary"/> YOUR CATERING WORKSPACE</div><h1 className="mt-4 font-display text-4xl text-secondary sm:text-5xl">The inbox.</h1><p className="mt-3 text-muted-foreground">A clear view of your inquiries, from first hello to kitchen handoff.</p></div><div className="flex flex-wrap gap-5"><Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><BarChart3 size={16}/> Dashboard</Link><Link to="/settings" className="text-sm font-semibold text-primary">Settings</Link><Link to="/menu" className="text-sm font-semibold text-primary">Menu</Link><Link to="/export" className="text-sm font-semibold text-primary">Export</Link><Link to="/crm" className="text-sm font-semibold text-primary">Customers <ArrowRight className="ml-1 inline" size={16}/></Link><Link to="/emails" className="text-sm font-semibold text-primary">Email previews <ArrowRight className="ml-1 inline" size={16}/></Link><Link to="/context" className="text-sm font-semibold text-primary">Business context & sign in <ArrowRight className="ml-1 inline" size={16}/></Link></div></div>
 {authorized && <p role="status" className="mt-5 text-xs text-muted-foreground">{liveStatus === "live" ? "Live updates connected" : liveStatus === "offline" ? "Live updates disconnected; information may be out of date." : "Connecting live updates…"}</p>}
 {loading ? <p className="mt-10 text-muted-foreground">Loading inbox…</p> : message ? <div role="status" className="mt-10 rounded-xl border border-border bg-card p-8"><p>{message}</p><Link to="/staff-login" className="mt-4 inline-block font-semibold text-primary">Go to staff sign in →</Link></div> : <><div className="mt-10"><h2 className="font-display text-2xl text-secondary">Workflow measurement</h2><p className="mt-2 text-sm text-muted-foreground">Measured inside this prototype only. No baseline has been established for La Bandera Kitchen&apos;s current process — these counters exist so the owner can set one. Session measurement starts when this inbox is first opened after sign-in.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(card=><article key={card.label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{card.label}</span><card.icon size={18} className="text-primary"/></div><div className="mt-5 font-display text-3xl text-secondary">{card.value}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{card.note}</p></article>)}</div><p className="mt-4 text-xs leading-5 text-muted-foreground">{metricLabel} {metrics && metrics.synthetic_count > 0 && `${metrics.synthetic_count} inquiries recorded this session.`}</p><section className="mt-12"><div className="flex items-end justify-between"><div><div className="eyebrow">ALL INQUIRIES</div><h2 className="mt-3 font-display text-3xl text-secondary">Gatherings in progress</h2></div><span className="text-sm text-muted-foreground">{visible.length} of {items.length} shown</span></div><div role="tablist" aria-label="Filter inquiries" className="mt-5 flex flex-wrap gap-2">{filters.map(f => <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === f.key ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card text-secondary hover:bg-accent"}`}>{f.label} <span className={filter === f.key ? "opacity-80" : "text-muted-foreground"}>{counts[f.key]}</span></button>)}</div><div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[650px] text-left"><thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Customer</th><th className="p-4">Status</th><th className="p-4">Guests</th><th className="p-4">Event date</th><th className="p-4">Completeness</th><th className="p-4">Margin</th><th className="p-4"><span className="sr-only">Open</span></th></tr></thead><tbody>{visible.map(({ item, prep })=>{ const latest = [...item.quote].sort((a,b)=>b.version-a.version)[0]; return <tr key={item.id} className="border-t border-border"><td className="p-4 font-semibold text-secondary">{item.customer?.name || "Customer"}{item.inquiry_metrics_context?.synthetic_demo && <span className="ml-2 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Demo</span>}</td><td className="p-4 text-sm"><span>{stageDetail(item.status, item.mesa_quote_version)}</span>{prep && <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${prepClass[prep]}`}>{prepLabel[prep]}</span>}</td><td className="p-4 text-sm">{item.guest_count ?? "—"}</td><td className="p-4 text-sm">{item.event_date || "—"}</td><td className="p-4 text-sm">{item.completeness_score == null ? "—" : `${item.completeness_score}%`}</td><td className="p-4 text-sm">{latest?.margin_pct == null ? "—" : `${(latest.margin_pct*100).toFixed(1)}%`}</td><td className="p-4"><Link to={`/owner?inquiry=${item.id}`} className="font-semibold text-primary">View →</Link></td></tr>; })}</tbody></table>{!visible.length && <p className="p-8 text-sm text-muted-foreground">{items.length ? "No inquiries match this filter." : "No inquiries yet."}</p>}</div></section></>}
 </div></main>;
}
