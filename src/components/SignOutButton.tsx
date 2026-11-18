import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function SignOutButton() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate("/staff-login", { replace: true });
  }
  return (
    <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
      <LogOut size={14} /> Sign out
    </button>
  );
}
