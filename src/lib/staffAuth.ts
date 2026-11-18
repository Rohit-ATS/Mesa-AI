import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "owner" | "kitchen";

export const roleHome: Record<StaffRole, string> = { owner: "/owner", kitchen: "/kitchen" };

export async function getStaffRole(userId: string): Promise<StaffRole | null> {
  const { data, error } = await supabase.from("mesa_staff").select("role").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data.role === "owner" || data.role === "kitchen" ? data.role : null;
}

export async function getCurrentStaff() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { email: null, role: null as StaffRole | null };
  return { email: user.email ?? null, role: await getStaffRole(user.id) };
}

export function authErrorMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  const code = "code" in error ? (error as AuthError).code : undefined;
  const text = error.message.toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (code === "email_not_confirmed" || text.includes("not confirmed")) return "This email has not been confirmed yet.";
  if (code === "user_already_exists" || code === "email_exists" || text.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (code === "weak_password" || text.includes("password should")) return "Password is too weak. Use at least 6 characters.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || text.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  if (code === "signup_disabled") return "New account registration is currently closed.";
  if (text.includes("fetch") || text.includes("network")) return "Sign-in service is unavailable. Check your connection and try again.";
  return error.message;
}
