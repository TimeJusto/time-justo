import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { REPO_KEYS, loadJSON, saveJSON, removeKey } from "@/services/storage";
import type { Profile } from "@/types";

interface CachedProfile {
  userId: string;
  profile: Profile;
  isCloud: boolean;
  at: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** isCloudUser decidido pelo servidor (admin ou Premium ativo). */
  isCloud: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: {
  id: string;
  email: string | null;
  role: string;
  plan: string;
  premium_until: string | null;
  trial_days_used: number;
  trial_last_day: string | null;
  created_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    role: row.role === "admin" ? "admin" : "user",
    plan: row.plan === "premium" ? "premium" : "free",
    premiumUntil: row.premium_until,
    trialDaysUsed: row.trial_days_used,
    trialLastDay: row.trial_last_day,
    createdAt: row.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCloud, setIsCloud] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    // Perfil (somente leitura para o próprio usuário via RLS).
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    let nextProfile: Profile | null = !error && data ? mapProfile(data) : null;
    let cloud = false;

    if (nextProfile) {
      // O direito à nuvem é decidido no servidor, nunca no cliente.
      const { data: rpcResult } = await supabase.rpc("is_cloud_user");
      cloud = rpcResult === true;
      saveJSON(REPO_KEYS.profileCache, {
        userId,
        profile: nextProfile,
        isCloud: cloud,
        at: Date.now(),
      } satisfies CachedProfile);
    } else {
      // Sem rede: usa o último perfil conhecido deste usuário.
      const cached = loadJSON<CachedProfile | null>(
        REPO_KEYS.profileCache,
        null,
      );
      if (cached && cached.userId === userId) {
        nextProfile = cached.profile;
        cloud = cached.isCloud;
      }
    }

    setProfile(nextProfile);
    setIsCloud(cloud);
  }, []);

  useEffect(() => {
    let active = true;

    // 1) Escuta ANTES de checar a sessão existente.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          const userId = nextSession.user.id;
          // Chamadas ao cliente dentro do callback são adiadas.
          setTimeout(() => {
            if (active) void loadProfile(userId);
          }, 0);
        } else {
          setProfile(null);
          setIsCloud(false);
        }
      },
    );

    // 2) Sessão já existente (mantém login ao recarregar).
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          void loadProfile(data.session.user.id);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    removeKey(REPO_KEYS.profileCache);
    setProfile(null);
    setIsCloud(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isCloud,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, isCloud, loading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
