import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const USERNAME_DOMAIN = "debatify.app";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function isValidUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
}

type AuthValue = {
  user: User | null;
  session: Session | null;
  username: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  username: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: got }) => {
      setSession(got.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const metaName = session?.user.user_metadata?.["username"];

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        username: typeof metaName === "string" ? metaName : null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
