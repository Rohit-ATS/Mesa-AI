import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, x-intake-session","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const agent="5c072189-22b5-4cf5-bfed-d02903f578b6";
const fail=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 const session=req.headers.get("x-intake-session") || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
 if(!/^[a-f0-9]{64}$/.test(session))return fail(401,"Invalid conversation session.");
 const key=Deno.env.get("ENTER_API_KEY_3759B04E"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key||!url||!service)return fail(503,"Intake assistant is unavailable.");
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(session));
 const hash=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");
 const db=createClient(url,service); const base=`https://api.enter.pro/code/api/v1/agents/${agent}`;
 const suffix=new URL(req.url).pathname.split("/mesa-intake-agent-3759b04e315c")[1]||"";
 const {data: mapping,error}=await db.from("mesa_intake_threads").select("thread_id").eq("session_hash",hash).eq("agent_id",agent).maybeSingle();
 if(error)return fail(503,"Conversation storage is unavailable.");
 if(req.method==="POST"&&suffix==="/threads"){
  if(mapping)return fail(409,"Conversation already exists.");
  const upstream=await fetch(`${base}/threads`,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:"{}"});
  if(!upstream.ok)return fail(502,"The intake assistant could not start.");
  const thread=await upstream.json(); if(typeof thread.thread_id!=="string")return fail(502,"Invalid assistant response.");
  const saved=await db.from("mesa_intake_threads").insert({session_hash:hash,thread_id:thread.thread_id,agent_id:agent,version:thread.version});
  if(saved.error)return fail(503,"Conversation could not be saved.");
  return new Response(JSON.stringify(thread),{headers:{...cors,"Content-Type":"application/json"}});
 }
 if(!mapping)return fail(404,"Conversation not found.");
 const parts=suffix.split("/").filter(Boolean); let path=""; let payload:string|undefined;
 if(req.method==="POST"&&suffix==="/run") {const body=await req.json().catch(()=>null);if(body?.threadId!==mapping.thread_id || !Array.isArray(body.messages) || JSON.stringify(body.messages).length>12000)return fail(400,"Invalid conversation message.");path="/run";payload=JSON.stringify({threadId:mapping.thread_id,messages:body.messages,tools:[],forwardedProps:{}});}
 else if(parts[0]==="threads"&&parts[1]===mapping.thread_id&&((req.method==="GET"&&parts.length===2)||(req.method==="GET"&&parts.length===3&&parts[2]==="turns")||(parts.length===5&&parts[2]==="turns"&&((req.method==="GET"&&parts[4]==="events")||(req.method==="POST"&&parts[4]==="cancel")))||(req.method==="POST"&&parts.length===7&&parts[2]==="turns"&&parts[4]==="tool-calls"&&parts[6]==="answer"))){path=`/${parts.map(encodeURIComponent).join("/")}${new URL(req.url).search}`;if(req.method==="POST")payload=await req.text();}
 else return fail(404,"Conversation action not found.");
 const upstream=await fetch(base+path,{method:req.method,headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",Accept:"text/event-stream, application/json"},body:payload});
 return new Response(upstream.body,{status:upstream.status,headers:{...cors,"Content-Type":upstream.headers.get("Content-Type")||"application/json","Cache-Control":"no-store"}});
});
