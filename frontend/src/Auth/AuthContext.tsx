import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, authApi, type AuthUser, type LoginPayload, type RegisterPayload, type RecentProgressItem, type ScheduleWorkoutItem, type StoredTokens } from "./authApi";

interface AuthContextValue {
  user: AuthUser | null;
  tokens: StoredTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  prefetchedSchedule: ScheduleWorkoutItem[] | null;
  prefetchedRecentProgress: RecentProgressItem[] | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<StoredTokens | null>;
  updateUser: (nextUser: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prefetchedSchedule, setPrefetchedSchedule] = useState<ScheduleWorkoutItem[] | null>(null);
  const [prefetchedRecentProgress, setPrefetchedRecentProgress] = useState<RecentProgressItem[] | null>(null);

  const clearAuthState = () => {
    setTokens(null);
    setUser(null);
  };

  const applySession = (nextUser: AuthUser, nextTokens: StoredTokens) => {
    setTokens(nextTokens);
    setUser(nextUser);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const refreshedTokens = await authApi.refresh();

        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + diffToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const [currentUser, schedule, recentProgress] = await Promise.all([
          authApi.getMe(refreshedTokens.accessToken),
          authApi.getSchedule(refreshedTokens.accessToken, fmt(weekStart), fmt(weekEnd)).catch(() => null),
          authApi.getRecentProgress(refreshedTokens.accessToken).catch(() => null),
        ]);

        if (!isMounted) return;

        applySession(currentUser, refreshedTokens);
        setPrefetchedSchedule(schedule);
        setPrefetchedRecentProgress(recentProgress);
      } catch {
        if (!isMounted) return;
        clearAuthState();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void bootstrap();

    return () => { isMounted = false; };
  }, []);

  const login = async (payload: LoginPayload) => {
    const result = await authApi.login(payload);
    applySession(result.user, result.tokens);
  };

  const register = async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    applySession(result.user, result.tokens);
  };

  const logout = async () => {
    const activeTokens = tokens;
    let logoutError: unknown = null;

    if (activeTokens?.accessToken) {
      try {
        await authApi.logout(activeTokens.accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
          logoutError = error;
        }
      }
    }

    clearAuthState();

    if (logoutError) {
      throw logoutError;
    }
  };

  const refreshSession = async (): Promise<StoredTokens | null> => {
    try {
      const refreshedTokens = await authApi.refresh();
      setTokens(refreshedTokens);
      return refreshedTokens;
    } catch {
      clearAuthState();
      return null;
    }
  };

  const updateUser = (nextUser: AuthUser) => {
    setUser(nextUser);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      isAuthenticated: Boolean(user && tokens?.accessToken),
      isLoading,
      prefetchedSchedule,
      prefetchedRecentProgress,
      login,
      register,
      logout,
      refreshSession,
      updateUser,
    }),
    [user, tokens, isLoading, prefetchedSchedule, prefetchedRecentProgress]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
};
