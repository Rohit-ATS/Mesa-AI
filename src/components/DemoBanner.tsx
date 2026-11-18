import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function DemoBanner() {
 const [signedIn,setSignedIn]=useState(false); const [dismissed,setDismissed]=useState(()=>sessionStorage.getItem("mesa-demo-banner") === "dismissed"); const { pathname }=useLocation();
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSignedIn(!!data.session));const {data}=supabase.auth.onAuthStateChange((_event,session)=>setSignedIn(!!session));return()=>data.subscription.unsubscribe();},[]);
 if(!signedIn || dismissed || pathname === "/" || pathname === "/") return null;
 return <div role="status" className="flex items-start justify-center gap-4 bg-accent px-5 py-3 text-sm text-accent-foreground"><span>Demo environment — all figures, costs and customer records are fictional sample values, fully editable. Not La Bandera Kitchen's actual business data.</span><button aria-label="Dismiss demo notice" onClick={()=>{sessionStorage.setItem("mesa-demo-banner","dismissed");setDismissed(true);}}><X size={18}/></button></div>;
}
