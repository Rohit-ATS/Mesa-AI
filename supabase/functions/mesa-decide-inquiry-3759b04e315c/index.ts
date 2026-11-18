import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const GMAIL_SEND = "https://api.enter.pro/code/api/v1/edge-function/connectors/operations/5bae9f31-1ebe-408c-b8c0-fbde3c072ab9";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const usd = (v: number | null | undefined) => v == null || !Number.isFinite(Number(v)) ? null : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
const styles: Record<string, string> = { dropoff: "Drop-off", setup: "Drop-off with setup", full_service: "Full service" };

type Dish = { qty_servings: number; menu_item: { name_es: string; name_en: string | null } | null };

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { message: "Method not allowed." });
  const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization");
  if (!url || !anon || !service) return json(503, { message: "Service unavailable." });
  if (!auth?.startsWith("Bearer ")) return json(401, { message: "Sign in is required." });

  const body = await req.json().catch(() => null) as { inquiryId?: string; decision?: string; customerEmail?: string; quote?: unknown } | null;
  if (!body?.inquiryId || !/^[0-9a-f-]{36}$/.test(body.inquiryId) || !["approved", "declined"].includes(body.decision ?? "")) return json(400, { message: "Invalid request." });

  // The owner's own session runs the decision so the database enforces owner access.
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: user } = await asUser.auth.getUser();
  if (!user.user) return json(401, { message: "Sign in is required." });
  const { error: decideError } = await asUser.rpc("mesa_decide_inquiry", { p_inquiry_id: body.inquiryId, p_decision: body.decision, p_customer_email: body.customerEmail ?? null, p_quote: body.quote ?? null });
  if (decideError) return json(decideError.message.includes("Owner access") ? 403 : 409, { message: decideError.message });
  if (body.decision === "declined") return json(200, { decision: "declined", message: "Declined. Moved to the declined list in CRM." });

  const db = createClient(url, service);
  const record = (email_status: string, email_error: string | null) => db.from("mesa_inquiry_decision").update({ email_status, email_error }).eq("inquiry_id", body.inquiryId!);
  const gmail = Deno.env.get("CONNECTOR_RUNTIME_TOKEN_3759b04e315c_1153");
  const [{ data: inq }, { data: dishes }, { data: quote }, { data: decision }] = await Promise.all([
    db.from("inquiry").select("event_date,event_time,guest_count,service_style,venue_address,dietary_flags,customer(name)").eq("id", body.inquiryId).single(),
    db.from("order_line").select("qty_servings,menu_item(name_es,name_en)").eq("inquiry_id", body.inquiryId),
    db.from("quote").select("recommended_price,price_per_guest").eq("inquiry_id", body.inquiryId).eq("status", "approved").order("version", { ascending: false }).limit(1).maybeSingle(),
    db.from("mesa_inquiry_decision").select("customer_email").eq("inquiry_id", body.inquiryId).single(),
  ]);
  const to = decision?.customer_email;
  if (!gmail || !inq || !to) {
    await record("skipped", !gmail ? "Email service unavailable" : "Missing order details");
    return json(200, { decision: "approved", emailStatus: "skipped", message: "Approved and sent to the kitchen. The customer confirmation email could not be sent." });
  }
  const name = String((inq.customer as { name?: string } | null)?.name ?? "").replace(/^Demo · /, "") || "there";
  const time = String(inq.event_time ?? "").slice(0, 5);
  const date = inq.event_date ? new Date(`${inq.event_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  const price = usd(quote?.recommended_price);
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto;color:#1f2933">
<div style="background:#1d2b4f;color:#fdf6e9;padding:22px"><div style="font-size:11px;letter-spacing:2px">LA BANDERA KITCHEN</div><h1 style="margin:8px 0 0;font-size:24px">Your catering is confirmed</h1></div>
<div style="padding:22px;background:#fdf6e9;line-height:1.6">
<p>Hi ${esc(name)},</p><p>Thank you for choosing La Bandera Kitchen. We're happy to confirm your order:</p>
<p style="background:#fff;padding:14px">${esc(date)}${time ? ` at ${esc(time)}` : ""}<br>${esc(inq.guest_count)} guests · ${esc(styles[inq.service_style ?? ""] ?? inq.service_style)}<br>${esc(inq.venue_address)}${inq.dietary_flags?.length ? `<br>Dietary notes: ${esc(inq.dietary_flags.join(", "))}` : ""}</p>
<h2 style="color:#b3202a;font-size:17px">Menu</h2><ul>${((dishes || []) as unknown as Dish[]).map(d => `<li>${esc(d.menu_item?.name_es)}${d.menu_item?.name_en ? ` (${esc(d.menu_item.name_en)})` : ""} · ${esc(d.qty_servings)} servings</li>`).join("")}</ul>
${price ? `<p><strong>Total: ${price}</strong>${quote?.price_per_guest ? ` (${usd(quote.price_per_guest)} per guest)` : ""}</p>` : ""}
<p>Our kitchen has your order on the schedule. Reply to this email if anything changes.</p><p>¡Buen provecho!<br>La Bandera Kitchen</p></div></div>`;
  try {
    const res = await fetch(GMAIL_SEND, { method: "POST", headers: { Authorization: `Bearer ${gmail}`, "Content-Type": "application/json" }, body: JSON.stringify({ input: { recipient_email: to, subject: `Your La Bandera Kitchen catering is confirmed — ${inq.event_date}`, body: html, is_html: true, include_signature: false } }) });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload && "data" in payload) { await record("accepted", null); return json(200, { decision: "approved", emailStatus: "accepted", message: `Approved. Sent to the kitchen and confirmation email sent to ${to}.` }); }
    const status = res.status >= 500 ? "unknown" : "failed";
    await record(status, payload?.error?.code ?? `HTTP ${res.status}`);
    return json(200, { decision: "approved", emailStatus: status, message: status === "unknown" ? "Approved and sent to the kitchen. The confirmation email result is unknown — check the sent folder before resending." : "Approved and sent to the kitchen, but the confirmation email failed." });
  } catch {
    await record("unknown", "Connection lost");
    return json(200, { decision: "approved", emailStatus: "unknown", message: "Approved and sent to the kitchen. The confirmation email result is unknown — check the sent folder before resending." });
  }
});
