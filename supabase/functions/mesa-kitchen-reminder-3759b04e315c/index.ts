import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends each released order's one-time kitchen reminder one hour before the suggested prep start.
// Called every 5 minutes by the scheduler, and right after a release (both authenticate with the job key).
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const GMAIL_SEND = "https://api.enter.pro/code/api/v1/edge-function/connectors/operations/5bae9f31-1ebe-408c-b8c0-fbde3c072ab9";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
// Kitchen messages never carry prices: strip any currency amounts from free text.
const noMoney = (t: unknown) => String(t ?? "").replace(/\p{Sc}\s*[\d,.]*/gu, "").trim();
const timeLA = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "2-digit" });

type Dish = { menu_item_id: string; servings: number; alternative_for: string | null };
type Release = { inquiry_id: string; prep_start_at: string; prep_start_reason: string | null; prep_start_source: string | null; dishes: Dish[]; inquiry: { event_date: string; event_time: string | null; guest_count: number | null; venue_zip: string | null; status: string } | null };

Deno.serve(async req => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json(503, { error: "Unavailable" });
  const db = createClient(url, service);
  const key = req.headers.get("x-mesa-job-key") ?? "";
  const { data: secret } = await db.from("mesa_job_secret").select("secret").eq("name", "kitchen_reminder").maybeSingle();
  if (!secret?.secret || key.length !== secret.secret.length || key !== secret.secret) return json(401, { error: "Unauthorized" });

  // Due = prep start within the next hour (or already passed), not yet reminded, prep start no more than 12 h ago.
  const now = Date.now();
  const { data: due, error } = await db.from("mesa_kitchen_release")
    .select("inquiry_id,prep_start_at,prep_start_reason,prep_start_source,dishes,inquiry(event_date,event_time,guest_count,venue_zip,status)")
    .is("reminder_sent_at", null).not("prep_start_at", "is", null)
    .lte("prep_start_at", new Date(now + 60 * 60 * 1000).toISOString())
    .gte("prep_start_at", new Date(now - 12 * 60 * 60 * 1000).toISOString());
  if (error) return json(500, { error: "Could not load releases" });

  const results: { inquiry_id: string; status: string }[] = [];
  let recipients: string[] | null = null;
  for (const r of (due || []) as unknown as Release[]) {
    if (r.inquiry?.status !== "approved") continue;
    // Claim first so a reminder is never sent twice.
    const { data: claimed } = await db.from("mesa_kitchen_release").update({ reminder_sent_at: new Date().toISOString() }).eq("inquiry_id", r.inquiry_id).is("reminder_sent_at", null).select("inquiry_id");
    if (!claimed?.length) continue;

    const ids = r.dishes.map(d => d.menu_item_id);
    const [{ data: menu }, { data: accoms }] = await Promise.all([
      ids.length ? db.from("menu_item").select("id,name_es,name_en").in("id", ids) : Promise.resolve({ data: [] as { id: string; name_es: string; name_en: string | null }[] }),
      db.from("mesa_accommodation").select("kind,label,guest_count,alt_servings,cross_contact_reviewed,menu_item:alt_menu_item_id(name_es)").eq("inquiry_id", r.inquiry_id).order("created_at"),
    ]);
    const names = new Map((menu || []).map(m => [m.id, m.name_es]));
    const dishes = r.dishes.map(d => `${noMoney(names.get(d.menu_item_id) ?? "Dish")} × ${d.servings}${d.alternative_for ? ` (alternative — ${noMoney(d.alternative_for)})` : ""}`);
    const acc = (accoms || []) as unknown as { kind: string; label: string; guest_count: number; alt_servings: number | null; cross_contact_reviewed: boolean; menu_item: { name_es: string } | null }[];
    const allergyLines = acc.filter(a => a.kind === "allergy").map(a => `ALLERGY: ${noMoney(a.label)} — ${a.guest_count} guests · cross-contact review ${a.cross_contact_reviewed ? "done" : "REQUIRED"}${a.menu_item ? ` · alternative ${noMoney(a.menu_item.name_es)} × ${a.alt_servings}` : ""}`);
    const prefLines = acc.filter(a => a.kind === "preference").map(a => `Preference: ${noMoney(a.label)} — ${a.guest_count} meals${a.menu_item ? ` · ${noMoney(a.menu_item.name_es)} × ${a.alt_servings}` : ""}`);
    const ev = r.inquiry!;
    const startsIn = Math.round((new Date(r.prep_start_at).getTime() - now) / 60000);
    const title = `Prep starts ${timeLA(r.prep_start_at)} — ${ev.event_date} order, ${ev.guest_count ?? "?"} guests`;
    const body = [
      startsIn > 0 ? `Start prep in about ${startsIn} min, at ${timeLA(r.prep_start_at)}.` : `Prep start time (${timeLA(r.prep_start_at)}) has passed — start now.`,
      `Event: ${ev.event_date} ${String(ev.event_time ?? "").slice(0, 5)} · ${ev.guest_count ?? "?"} guests · area ${noMoney(ev.venue_zip ?? "to confirm")}`,
      `Dishes: ${dishes.join(", ") || "see kitchen ticket"}`,
      ...(allergyLines.length || prefLines.length ? [...allergyLines, ...prefLines] : ["No allergies or preferences recorded."]),
      `Timing: ${r.prep_start_source === "ai" ? "AI-suggested" : "Standard estimate"} — ${noMoney(r.prep_start_reason ?? "")}`,
    ].join("\n");
    await db.from("mesa_message").insert({ channel: "kitchen", sender_kind: "system", sender_label: "Mesa", title, body: body.slice(0, 7900), inquiry_id: r.inquiry_id, link: "/kitchen", dedupe_key: `prep-reminder:${r.inquiry_id}` });

    // Matching email reminder to kitchen staff.
    const gmail = Deno.env.get("CONNECTOR_RUNTIME_TOKEN_3759b04e315c_1153");
    if (recipients === null) {
      recipients = [];
      const { data: kitchen } = await db.from("mesa_staff").select("user_id").eq("role", "kitchen");
      for (const k of kitchen || []) { const { data } = await db.auth.admin.getUserById(k.user_id); if (data.user?.email) recipients.push(data.user.email); }
    }
    let status = "skipped";
    if (gmail && recipients.length) {
      const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto"><div style="background:#1d2b4f;color:#fdf6e9;padding:18px"><div style="font-size:11px;letter-spacing:2px">LA BANDERA KITCHEN · PREP REMINDER</div><h1 style="margin:6px 0 0;font-size:22px">${esc(title)}</h1></div><div style="padding:18px;background:#fdf6e9;line-height:1.6">${body.split("\n").map(l => `<p style="margin:0 0 8px">${esc(l)}</p>`).join("")}</div></div>`;
      try {
        const res = await fetch(GMAIL_SEND, { method: "POST", headers: { Authorization: `Bearer ${gmail}`, "Content-Type": "application/json" }, body: JSON.stringify({ input: { recipient_email: recipients[0], extra_recipients: recipients.slice(1), subject: `[Mesa Kitchen] ${title}`, body: html, is_html: true, include_signature: false } }) });
        const payload = await res.json().catch(() => null);
        status = res.ok && payload && "data" in payload ? "accepted" : res.status >= 500 ? "unknown" : "failed";
      } catch { status = "unknown"; }
    }
    await db.from("mesa_kitchen_release").update({ reminder_email_status: status }).eq("inquiry_id", r.inquiry_id);
    results.push({ inquiry_id: r.inquiry_id, status });
  }
  return json(200, { sent: results.length, results });
});
