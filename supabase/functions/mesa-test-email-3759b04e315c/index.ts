import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const response = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response(405, "Method not allowed.");
  const auth = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_ANON_KEY"); const token = Deno.env.get("CONNECTOR_RUNTIME_TOKEN_3759b04e315c_1153");
  if (!auth || !url || !key || !token) return response(503, "Test sending is unavailable.");
  const client = createClient(url, key, { global: { headers: { Authorization: auth } } });
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user) return response(401, "Sign in is required.");
  const { data: staff } = await client.from("mesa_staff").select("role").eq("user_id", identity.user.id).maybeSingle();
  if (staff?.role !== "owner") return response(403, "Owner access is required.");
  let input: { inquiryId?: string; recipient?: string; subject?: string; html?: string; audience?: string; permissionConfirmed?: boolean };
  try { input = await req.json(); } catch { return response(400, "Invalid request."); }
  if (!input.inquiryId || !input.recipient || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.recipient) || input.recipient.length > 254 || !input.permissionConfirmed || !["owner","kitchen"].includes(input.audience || "") || !input.subject || /[\r\n]/.test(input.subject) || !input.html || input.html.length > 50000) return response(400, "Enter a team address and confirm recipient permission.");
  const { data: order, error: orderError } = await client.from("inquiry").select("id,status,inquiry_metrics_context(synthetic_demo)").eq("id",input.inquiryId).maybeSingle();
  if (orderError || !order || order.status !== "approved" || !order.inquiry_metrics_context?.synthetic_demo) return response(403, "Test emails are limited to approved synthetic demo orders.");
  if (input.audience === "kitchen" && /\p{Sc}/u.test(input.html + input.subject)) return response(400, "Kitchen email cannot contain currency symbols.");
  let upstream: Response;
  try { upstream = await fetch("https://api.enter.pro/code/api/v1/edge-function/connectors/operations/5bae9f31-1ebe-408c-b8c0-fbde3c072ab9", { method:"POST", headers:{ "Authorization":`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ input:{ recipient_email:input.recipient, subject:`[DEMO] ${input.subject}`, body:input.html, is_html:true, include_signature:false } }) }); }
  catch { return response(502, "The send result is unknown. Check the mailbox before trying again."); }
  if (!upstream.ok) return response(502, "The send result could not be confirmed. Check the mailbox before trying again.");
  let payload: unknown; try { payload = await upstream.json(); } catch { return response(502, "The send result could not be confirmed. Check the mailbox before trying again."); }
  if (!payload || typeof payload !== "object" || !("data" in payload)) return response(502, "The send result could not be confirmed. Check the mailbox before trying again.");
  return response(200, "The test message was accepted by Gmail. Delivery is not confirmed.");
});
