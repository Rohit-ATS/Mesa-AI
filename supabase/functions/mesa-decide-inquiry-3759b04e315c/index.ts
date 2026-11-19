import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const GMAIL_SEND = "https://api.enter.pro/code/api/v1/edge-function/connectors/operations/5bae9f31-1ebe-408c-b8c0-fbde3c072ab9";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const usd = (v: number | null | undefined) => v == null || !Number.isFinite(Number(v)) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
const styles: Record<string, string> = { dropoff: "Drop-off", setup: "Drop-off with setup", full_service: "Full service" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Line = { kind: string; label: string; qty?: number | null; unit?: string | null; unit_price?: number | null; amount: number | null; note?: string | null };
type Inquiry = { event_date: string | null; event_time: string | null; guest_count: number | null; service_style: string | null; venue_address: string | null; customer: { name: string | null } | null };
type Accom = { kind: string; label: string; guest_count: number; menu_item: { name_es: string } | null; alt_servings: number | null };

async function sendEmail(to: string, subject: string, html: string): Promise<{ status: "accepted" | "failed" | "unknown" | "skipped"; error: string | null }> {
  const gmail = Deno.env.get("CONNECTOR_RUNTIME_TOKEN_3759b04e315c_1153");
  if (!gmail) return { status: "skipped", error: "Email service unavailable" };
  try {
    const res = await fetch(GMAIL_SEND, { method: "POST", headers: { Authorization: `Bearer ${gmail}`, "Content-Type": "application/json" }, body: JSON.stringify({ input: { recipient_email: to, subject, body: html, is_html: true, include_signature: false } }) });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload && "data" in payload) return { status: "accepted", error: null };
    return { status: res.status >= 500 ? "unknown" : "failed", error: payload?.error?.code ?? `HTTP ${res.status}` };
  } catch {
    return { status: "unknown", error: "Connection lost" };
  }
}

function eventBlock(inq: Inquiry) {
  const date = inq.event_date ? new Date(`${inq.event_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  const time = String(inq.event_time ?? "").slice(0, 5);
  return `<p style="background:#fff;padding:14px">${esc(date)}${time ? ` at ${esc(time)}` : ""}<br>${esc(inq.guest_count)} guests · ${esc(styles[inq.service_style ?? ""] ?? inq.service_style)}<br>${esc(inq.venue_address)}</p>`;
}

function accomBlock(accoms: Accom[]) {
  if (!accoms.length) return "";
  return `<h2 style="color:#b3202a;font-size:17px">Allergies &amp; preferences</h2><ul>${accoms.map(a => `<li><strong>${a.kind === "allergy" ? "Allergy" : "Preference"}:</strong> ${esc(a.label)} — ${esc(a.guest_count)} guests${a.menu_item ? ` · alternative: ${esc(a.menu_item.name_es)} (${esc(a.alt_servings)} servings)` : ""}</li>`).join("")}</ul>`;
}

function linesTable(lines: Line[], subtotal: number, tax: number | null, total: number) {
  const taxLine = lines.find(l => l.kind === "tax");
  const rows = lines.filter(l => l.kind !== "tax").map(l => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(l.label)}${l.kind === "optional" ? ' <span style="color:#777;font-size:12px">(optional)</span>' : ""}${l.note ? `<br><span style="color:#777;font-size:12px">${esc(l.note)}</span>` : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${esc(l.qty)} ${esc(l.unit ?? "")} × ${usd(l.unit_price)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${usd(l.amount)}</td></tr>`).join("");
  const taxRow = taxLine ? `<tr><td colspan="2" style="padding:8px">${tax == null ? "Tax: pending — will be confirmed before your event" : esc(taxLine.label)}</td><td style="padding:8px;text-align:right">${tax == null ? "Pending" : usd(tax)}</td></tr>` : "";
  return `<table style="width:100%;border-collapse:collapse;background:#fff;font-size:14px">${rows}<tr><td colspan="2" style="padding:8px;font-weight:bold">Subtotal</td><td style="padding:8px;text-align:right;font-weight:bold">${usd(subtotal)}</td></tr>${taxRow}<tr><td colspan="2" style="padding:8px;font-weight:bold;font-size:16px">${taxLine && tax == null ? "Total before tax" : "Total"}</td><td style="padding:8px;text-align:right;font-weight:bold;font-size:16px">${usd(total)}</td></tr></table>`;
}

const shell = (title: string, inner: string) => `<div style="font-family:Georgia,serif;max-width:640px;margin:auto;color:#1f2933"><div style="background:#1d2b4f;color:#fdf6e9;padding:22px"><div style="font-size:11px;letter-spacing:2px">LA BANDERA KITCHEN</div><h1 style="margin:8px 0 0;font-size:24px">${title}</h1></div><div style="padding:22px;background:#fdf6e9;line-height:1.6">${inner}<p>¡Buen provecho!<br>La Bandera Kitchen</p></div></div>`;

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { message: "Method not allowed." });
  const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization");
  if (!url || !anon || !service) return json(503, { message: "Service unavailable." });
  if (!auth?.startsWith("Bearer ")) return json(401, { message: "Sign in is required." });

  const body = await req.json().catch(() => null) as { action?: string; decision?: string; inquiryId?: string; customerEmail?: string; lines?: unknown; quote?: unknown; origin?: string } | null;
  const action = body?.action ?? (body?.decision === "declined" ? "decline" : body?.decision === "approved" ? "approve_legacy" : "");
  if (!body?.inquiryId || !UUID.test(body.inquiryId) || !["approve_quote", "release", "decline", "approve_legacy"].includes(action)) return json(400, { message: "Invalid request." });
  if (action === "approve_legacy") return json(409, { message: "Approval now has three steps: approve the quote, wait for the customer to accept it, then release to the kitchen. Please reload the page." });

  // The owner's own session runs every step so the database enforces owner access.
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: user } = await asUser.auth.getUser();
  if (!user.user) return json(401, { message: "Sign in is required." });
  const fail = (e: { message: string }) => json(e.message.includes("Owner access") ? 403 : 409, { message: e.message });
  const db = createClient(url, service);
  const inquiryId = body.inquiryId;

  if (action === "decline") {
    const { error } = await asUser.rpc("mesa_decide_inquiry", { p_inquiry_id: inquiryId, p_decision: "declined" });
    return error ? fail(error) : json(200, { message: "Declined. Moved to the declined list in CRM." });
  }

  const [{ data: inq }, { data: accoms }] = await Promise.all([
    db.from("inquiry").select("event_date,event_time,guest_count,service_style,venue_address,customer(name)").eq("id", inquiryId).single(),
    db.from("mesa_accommodation").select("kind,label,guest_count,alt_servings,menu_item:alt_menu_item_id(name_es)").eq("inquiry_id", inquiryId).order("created_at"),
  ]);
  const name = (inq: Inquiry | null) => String(inq?.customer?.name ?? "").replace(/^Demo · /, "") || "there";

  if (action === "approve_quote") {
    let origin: string;
    try { const u = new URL(String(body.origin)); if (!["https:", "http:"].includes(u.protocol)) throw new Error(); origin = u.origin; } catch { return json(400, { message: "Invalid app address." }); }
    const { data: approved, error } = await asUser.rpc("mesa_approve_quote_version", { p_inquiry_id: inquiryId, p_customer_email: body.customerEmail ?? "", p_lines: body.lines ?? null, p_quote: body.quote ?? null });
    if (error) return fail(error);
    const result = approved as { version_id: string; version: number; token: string };
    const { data: ver } = await db.from("mesa_quote_version").select("lines,subtotal,tax_amount,total,customer_email").eq("id", result.version_id).single();
    const record = (s: { status: string; error: string | null }) => db.from("mesa_quote_version").update({ email_status: s.status, email_error: s.error }).eq("id", result.version_id);
    if (!ver || !inq) { await record({ status: "skipped", error: "Missing quote details" }); return json(200, { version: result.version, emailStatus: "skipped", message: `Quote v${result.version} approved, but the email could not be prepared.` }); }
    const link = `${origin}/accept/${result.token}`;
    const html = shell(`Your catering quote (v${result.version})`, `<p>Hi ${esc(name(inq as unknown as Inquiry))},</p><p>Thank you for your inquiry. Here is your itemised quote:</p>${eventBlock(inq as unknown as Inquiry)}${linesTable(ver.lines as Line[], Number(ver.subtotal), ver.tax_amount == null ? null : Number(ver.tax_amount), Number(ver.total))}${accomBlock((accoms || []) as unknown as Accom[])}
<p style="margin:26px 0;text-align:center"><a href="${esc(link)}" style="background:#b3202a;color:#fff;padding:14px 26px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Accept this quote</a></p>
<p style="font-size:13px;color:#555">Your order is confirmed only after you accept and we confirm the kitchen schedule. If we send a revised quote, this link will stop working and the newest quote replaces it. No payment is taken through this link.</p>`);
    const sent = await sendEmail(ver.customer_email, `Your La Bandera Kitchen quote (v${result.version}) — ${(inq as unknown as Inquiry).event_date ?? ""}`, html);
    await record(sent);
    const tail = sent.status === "accepted" ? `emailed to ${ver.customer_email}.` : sent.status === "unknown" ? "the email result is unknown — check the sent folder before resending." : "but the quote email could not be sent.";
    return json(200, { version: result.version, emailStatus: sent.status, message: `Quote v${result.version} approved — ${tail} Nothing has gone to the kitchen yet.` });
  }

  // release
  const { data: released, error } = await asUser.rpc("mesa_release_to_kitchen", { p_inquiry_id: inquiryId });
  if (error) return fail(error);
  const r = released as { already: boolean; version: number; customer_email?: string };
  if (r.already) return json(200, { emailStatus: "skipped", message: `Already released (v${r.version}). No second kitchen ticket was created.` });
  const { data: rel } = await db.from("mesa_kitchen_release").select("customer_email,dishes,mesa_quote_version(lines,subtotal,tax_amount,total)").eq("inquiry_id", inquiryId).single();
  const record = async (s: { status: string; error: string | null }) => {
    await db.from("mesa_kitchen_release").update({ email_status: s.status, email_error: s.error }).eq("inquiry_id", inquiryId);
    await db.from("mesa_inquiry_decision").update({ email_status: s.status, email_error: s.error }).eq("inquiry_id", inquiryId);
  };
  const ver = (rel as unknown as { mesa_quote_version: { lines: Line[]; subtotal: number; tax_amount: number | null; total: number } | null } | null)?.mesa_quote_version;
  if (!rel?.customer_email || !inq || !ver) { await record({ status: "skipped", error: "Missing order details" }); return json(200, { emailStatus: "skipped", message: "Released to the kitchen. The customer confirmation email could not be sent." }); }
  const html = shell("Your catering is confirmed", `<p>Hi ${esc(name(inq as unknown as Inquiry))},</p><p>Thank you for accepting your quote. Your order is confirmed and on our kitchen schedule:</p>${eventBlock(inq as unknown as Inquiry)}${linesTable(ver.lines, Number(ver.subtotal), ver.tax_amount == null ? null : Number(ver.tax_amount), Number(ver.total))}${accomBlock((accoms || []) as unknown as Accom[])}<p>Reply to this email if anything changes.</p>`);
  const sent = await sendEmail(rel.customer_email, `Your La Bandera Kitchen catering is confirmed — ${(inq as unknown as Inquiry).event_date ?? ""}`, html);
  await record(sent);
  const tail = sent.status === "accepted" ? `Confirmation email sent to ${rel.customer_email}.` : sent.status === "unknown" ? "The confirmation email result is unknown — check the sent folder before resending." : "The confirmation email failed.";
  return json(200, { emailStatus: sent.status, message: `Released to the kitchen (v${r.version}). ${tail}` });
});
