import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, authApi, type AuthUser, type LoginPayload, type RegisterPayload, type StoredTokens } from "./authApi";
import { tokenStorage } from "./tokenStorage";

interface AuthContextValue {
  user: AuthUser | null;
  tokens: StoredTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

const shouldTryRefresh = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = () => {
    tokenStorage.clear();
    setTokens(null);
    setUser(null);
  };

  const applySession = (nextUser: AuthUser, nextTokens: StoredTokens) => {
    tokenStorage.set(nextTokens);
    setTokens(nextTokens);
    setUser(nextUser);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const savedTokens = tokenStorage.get();
      if (!savedTokens) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setTokens(savedTokens);
      }

      try {
        const currentUser = await authApi.getMe(savedTokens.accessToken);
        if (!isMounted) {
          return;
        }
        setUser(currentUser);
        setIsLoading(false);
        return;
      } catch (error) {
        if (!shouldTryRefresh(error)) {
          if (isMounted) {
            clearAuthState();
            setIsLoading(false);
          }
          return;
        }
      }

      try {
        const refreshedTokens = await authApi.refresh(savedTokens.refreshToken);
        const currentUser = await authApi.getMe(refreshedTokens.accessToken);

        if (!isMounted) {
          return;
        }

        applySession(currentUser, refreshedTokens);
      } catch {
        if (!isMounted) {
          return;
        }
        clearAuthState();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
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
    const activeTokens = tokenStorage.get();
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
    const activeTokens = tokenStorage.get();
    if (!activeTokens?.refreshToken) {
      return null;
    }

    try {
      const refreshedTokens = await authApi.refresh(activeTokens.refreshToken);
      tokenStorage.set(refreshedTokens);
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
      login,
      register,
      logout,
      refreshSession,
      updateUser,
    }),
    [user, tokens, isLoading]
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
