import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StaffSignInForm from "@/components/StaffSignInForm";
import { getCurrentStaff, roleHome } from "@/lib/staffAuth";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentStaff().then(({ email, role }) => {
      if (role) { navigate(roleHome[role], { replace: true }); return; }
      setSignedInEmail(email);
      setChecking(false);
    });
  }, [navigate]);

  async function signOut() { await supabase.auth.signOut(); setSignedInEmail(null); }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link to="/" className="font-display text-xl font-bold text-secondary">la bandera <span className="text-primary">kitchen</span></Link>
        <div className="mt-12 rounded-xl border border-border bg-card p-7">
          <div className="eyebrow">MESA / STAFF</div>
          <h1 className="mt-3 font-display text-3xl text-secondary">Staff sign in</h1>
          <p className="mt-3 text-sm text-muted-foreground">One sign-in for owner and kitchen accounts.</p>
          <div className="mt-6">
            {checking ? <p className="text-sm text-muted-foreground">Checking session…</p>
              : signedInEmail ? <div className="space-y-4"><p role="alert" className="text-sm text-destructive">{signedInEmail} has no owner or kitchen access.</p><button onClick={signOut} className="rounded-lg border border-border px-5 py-3 text-sm">Sign out</button></div>
              : <StaffSignInForm onSignedIn={role => navigate(roleHome[role], { replace: true })} />}
          </div>
        </div>
      </div>
    </main>
  );
}
