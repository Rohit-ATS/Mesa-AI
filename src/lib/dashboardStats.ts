import { addMonths, addWeeks, format, startOfMonth, startOfWeek } from "date-fns";
import { checklistFromRows, prepState, type PrepState } from "@/lib/prepStatus";
import { workflowStage, type Stage, type VersionRow } from "@/lib/workflowStage";

export type DashInquiry = {
  id: string; created_at: string; status: string; guest_count: number | null; event_date: string | null; event_time: string | null; service_style: string | null;
  customer: { id: string; name: string; org_type: string | null } | null;
  order_line: { qty_servings: number; menu_item: { name_es: string } | null }[];
  kitchen_checklist: { item_key: string; done: boolean }[];
  quote: { recommended_price: number | null; version: number; status: string | null }[];
  mesa_quote_version: VersionRow[];
};

export function stageCounts(rows: DashInquiry[]) {
  const counts: Record<Stage, number> = { needs_approval: 0, quote_sent: 0, ready_to_release: 0, released: 0, declined: 0 };
  for (const r of rows) counts[workflowStage(r.status, r.mesa_quote_version)] += 1;
  return counts;
}

export type Grain = "week" | "month";
const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

export function trend(rows: DashInquiry[], grain: Grain) {
  const now = new Date();
  const count = grain === "week" ? 12 : 6;
  const start = grain === "week" ? addWeeks(startOfWeek(now, { weekStartsOn: 1 }), -(count - 1)) : addMonths(startOfMonth(now), -(count - 1));
  const buckets = Array.from({ length: count }, (_, i) => {
    const from = grain === "week" ? addWeeks(start, i) : addMonths(start, i);
    const to = grain === "week" ? addWeeks(from, 1) : addMonths(from, 1);
    const inBucket = rows.filter(r => { const t = new Date(r.created_at); return t >= from && t < to; });
    const guests = inBucket.map(r => r.guest_count).filter((g): g is number => g != null);
    const a = avg(guests);
    return { label: grain === "week" ? format(from, "MMM d") : format(from, "MMM yyyy"), requests: inBucket.length, approved: inBucket.filter(r => r.status === "approved").length, avgGuests: a == null ? null : Math.round(a) };
  });
  return buckets;
}

export function summary(rows: DashInquiry[]) {
  const guests = rows.map(r => r.guest_count).filter((g): g is number => g != null);
  const approved = rows.filter(r => r.status === "approved");
  const decided = rows.filter(r => r.status === "approved" || r.status === "declined").length;
  const revenue = approved.reduce((sum, r) => {
    const q = [...r.quote].sort((a, b) => b.version - a.version).find(x => x.status === "approved") ?? [...r.quote].sort((a, b) => b.version - a.version)[0];
    return sum + (q?.recommended_price ? Number(q.recommended_price) : 0);
  }, 0);
  return {
    total: rows.length, approved: approved.length, pending: rows.filter(r => r.status !== "approved" && r.status !== "declined").length,
    approvalRate: decided ? approved.length / decided : null, avgGuests: avg(guests), revenue,
  };
}

function tally(values: string[], top?: number) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) || 0) + 1);
  const list = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return top ? list.slice(0, top) : list;
}

export function customerProfile(rows: DashInquiry[]) {
  const byCustomer = new Map<string, { org: string; count: number }>();
  for (const r of rows) if (r.customer) {
    const cur = byCustomer.get(r.customer.id) || { org: r.customer.org_type ? titleCase(r.customer.org_type) : "Not recorded", count: 0 };
    byCustomer.set(r.customer.id, { ...cur, count: cur.count + 1 });
  }
  const customers = [...byCustomer.values()];
  const sizeBands = [["1–25", 1, 25], ["26–50", 26, 50], ["51–100", 51, 100], ["101–200", 101, 200], ["200+", 201, Infinity]] as const;
  return {
    orgTypes: tally(customers.map(c => c.org)),
    repeat: { repeat: customers.filter(c => c.count > 1).length, single: customers.filter(c => c.count === 1).length },
    serviceStyles: tally(rows.map(r => r.service_style ? titleCase(r.service_style) : "Not set")),
    partySizes: sizeBands.map(([name, lo, hi]) => ({ name, value: rows.filter(r => r.guest_count != null && r.guest_count >= lo && r.guest_count <= hi).length })),
    topDishes: tally(rows.flatMap(r => r.order_line.map(l => l.menu_item?.name_es).filter((n): n is string => !!n)), 6),
  };
}

export function approvedEvents(rows: DashInquiry[]) {
  return rows.filter(r => r.status === "approved" && r.event_date).map(r => ({
    id: r.id, date: r.event_date!, time: r.event_time, guests: r.guest_count, title: r.customer?.name?.replace(/^Demo · /, "") || "Customer",
    prep: prepState(checklistFromRows(r.kitchen_checklist)) as PrepState,
  }));
}
