import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, supabaseConfigError } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configError: string | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const missingConfig = () => new Error(supabaseConfigError);
const raise = (error: AuthError | null) => {
  if (error) throw new Error(safeAuthError(error));
};

export function safeAuthError(error: AuthError): string {
  if (error.status === 429) return "Too many attempts. Wait a little while and try again.";
  if (/invalid login credentials/i.test(error.message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(error.message))
    return "Please verify your email before signing in.";
  if (/password/i.test(error.message) && /weak|short|least/i.test(error.message))
    return "Choose a stronger password that meets all the listed requirements.";
  return "We could not complete that request. Check your details and try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabaseConfigError) {
      setLoading(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    void getSupabaseClient()
      .then(async (client) => {
        if (!active || !client) return;
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event, next) => {
          if (active) {
            setSession(next);
            setLoading(false);
          }
        });
        unsubscribe = () => subscription.unsubscribe();
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configError: supabaseConfigError,
      signIn: async (email, password) => {
        const supabase = await getSupabaseClient();
        if (!supabase) throw missingConfig();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        raise(error);
      },
      signUp: async (fullName, email, password) => {
        const supabase = await getSupabaseClient();
        if (!supabase) throw missingConfig();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/" },
        });
        raise(error);
        return { needsEmailVerification: !data.session };
      },
      signOut: async () => {
        const supabase = await getSupabaseClient();
        if (!supabase) throw missingConfig();
        const { error } = await supabase.auth.signOut();
        raise(error);
      },
      requestPasswordReset: async (email) => {
        const supabase = await getSupabaseClient();
        if (!supabase) throw missingConfig();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        raise(error);
      },
      updatePassword: async (password) => {
        const supabase = await getSupabaseClient();
        if (!supabase) throw missingConfig();
        const { error } = await supabase.auth.updateUser({ password });
        raise(error);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
