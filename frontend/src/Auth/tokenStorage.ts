import type { StoredTokens } from "./authApi";

const TOKENS_STORAGE_KEY = "fitness_tracker_auth_tokens";

const isStoredTokens = (value: unknown): value is StoredTokens => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredTokens>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    candidate.tokenType === "bearer"
  );
};

export const tokenStorage = {
  get(): StoredTokens | null {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isStoredTokens(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  set(tokens: StoredTokens): void {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  },

  clear(): void {
    localStorage.removeItem(TOKENS_STORAGE_KEY);
  },
};
