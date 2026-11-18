import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, getStaffRole, type StaffRole } from "@/lib/staffAuth";

type Props = { onSignedIn: (role: StaffRole) => void };

export default function StaffSignInForm({ onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<"signin" | "signup" | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("signin"); setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) { setMessage({ tone: "error", text: authErrorMessage(error) }); setBusy(null); return; }
    const role = await getStaffRole(data.user.id);
    if (!role) {
      await supabase.auth.signOut();
      setMessage({ tone: "error", text: "Signed in, but this account has no owner or kitchen access. Ask the owner to assign a role." });
      setBusy(null); return;
    }
    setBusy(null);
    onSignedIn(role);
  }

  async function signUp() {
    if (!email.trim() || password.length < 6) { setMessage({ tone: "error", text: "Enter an email and a password of at least 6 characters." }); return; }
    setBusy("signup"); setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/staff-login` } });
    if (error) { setMessage({ tone: "error", text: authErrorMessage(error) }); setBusy(null); return; }
    if (data.user && data.user.identities?.length === 0) { setMessage({ tone: "error", text: "An account with this email already exists. Sign in instead." }); setBusy(null); return; }
    await supabase.auth.signOut();
    setMessage({ tone: "info", text: "Account created. It has no staff access until the owner assigns a role." });
    setBusy(null);
  }

  return (
    <form onSubmit={signIn} className="space-y-4">
      <label className="block text-sm">Email
        <input required autoComplete="username" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
      </label>
      <label className="block text-sm">Password
        <input required autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
      </label>
      {message && <p role="alert" className={message.tone === "error" ? "text-sm text-destructive" : "rounded-lg bg-accent p-3 text-sm"}>{message.text}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!!busy} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy === "signin" ? "Signing in…" : "Sign in"}</button>
        <button type="button" onClick={signUp} disabled={!!busy} className="rounded-lg border border-border px-5 py-3 text-sm disabled:opacity-50">{busy === "signup" ? "Creating…" : "Create account"}</button>
      </div>
      <p className="text-xs text-muted-foreground">Owners go to the owner inbox, kitchen staff to the kitchen board. Creating an account does not grant access.</p>
    </form>
  );
}
