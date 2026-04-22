const DEFAULT_API_BASE_URL = "http://localhost:8000/api";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readErrorMessage = (payload: unknown, status: number): string => {
  if (isRecord(payload)) {
    const detail = payload.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }

  return `HTTP ${status}`;
};

export class ApiError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions<TBody> {
  method?: RequestMethod;
  body?: TBody;
  accessToken?: string;
}

const request = async <TResponse, TBody = undefined>(
  path: string,
  options: RequestOptions<TBody> = {}
): Promise<TResponse> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const raw = await response.text();
  const payload: unknown = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new ApiError(response.status, readErrorMessage(payload, response.status));
  }

  return payload as TResponse;
};

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

interface AuthResponse extends TokenPairResponse {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
}

export interface AuthResult {
  user: AuthUser;
  tokens: StoredTokens;
}

const mapTokens = (pair: TokenPairResponse): StoredTokens => ({
  accessToken: pair.access_token,
  refreshToken: pair.refresh_token,
  tokenType: pair.token_type,
});

const mapAuthResult = (response: AuthResponse): AuthResult => ({
  user: response.user,
  tokens: mapTokens(response),
});

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const response = await request<AuthResponse, LoginPayload>("/auth/login", {
      method: "POST",
      body: payload,
    });
    return mapAuthResult(response);
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const response = await request<AuthResponse, RegisterPayload>("/auth/register", {
      method: "POST",
      body: payload,
    });
    return mapAuthResult(response);
  },

  async refresh(refreshToken: string): Promise<StoredTokens> {
    const response = await request<TokenPairResponse, { refresh_token: string }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });

    return mapTokens(response);
  },

  async logout(accessToken: string): Promise<void> {
    await request<{ detail: string }, undefined>("/auth/logout", {
      method: "POST",
      accessToken,
    });
  },

  async getMe(accessToken: string): Promise<AuthUser> {
    return request<AuthUser, undefined>("/users/me", {
      method: "GET",
      accessToken,
    });
  },
};
