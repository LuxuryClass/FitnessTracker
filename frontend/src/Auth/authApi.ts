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

export interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  accessToken?: string;
  credentials?: RequestCredentials;
}

export const apiRequest = async <TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> => {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const requestBody: BodyInit | undefined =
    options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: requestBody,
    credentials: options.credentials,
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

const request = apiRequest;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  gender: "male" | "female" | null;
  birth_date: string | null;
  height: number | string | null;
  weight: number | string | null;
  avatar_url: string | null;
  is_active: boolean;
  streak_weeks: number;
  weekly_volume_tons: number | string;
  weekly_sessions_progress: {
    completed: number;
    total: number;
  };
  created_at: string;
  updated_at: string;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface UpdateProfilePayload {
  email?: string;
  name?: string;
  gender?: "male" | "female";
  birth_date?: string;
  height?: number | string;
  weight?: number | string;
}

interface AuthResponse extends AccessTokenResponse {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface StoredTokens {
  accessToken: string;
  tokenType: "bearer";
}

export interface AuthResult {
  user: AuthUser;
  tokens: StoredTokens;
}

export interface ScheduleWorkoutItem {
  id: string;
  title: string;
  date: string;
  time: string | null;
  status: 'planned' | 'completed';
  exercises_count: number;
  muscle_groups: string[];
}

export interface RecentProgressItem {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  difference_kg: number | string;
  recent_max_weight_kg: number | string;
  previous_max_weight_kg: number | string | null;
}

const mapTokens = (pair: AccessTokenResponse): StoredTokens => ({
  accessToken: pair.access_token,
  tokenType: pair.token_type,
});

const mapAuthResult = (response: AuthResponse): AuthResult => ({
  user: response.user,
  tokens: mapTokens(response),
});

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
      credentials: "include",
    });
    return mapAuthResult(response);
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const response = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
      credentials: "include",
    });
    return mapAuthResult(response);
  },

  async refresh(): Promise<StoredTokens> {
    const response = await request<AccessTokenResponse>("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    return mapTokens(response);
  },

  async logout(accessToken: string): Promise<void> {
    await request<{ detail: string }>("/auth/logout", {
      method: "POST",
      accessToken,
      credentials: "include",
    });
  },

  async getMe(accessToken: string): Promise<AuthUser> {
    return request<AuthUser>("/users/me", {
      method: "GET",
      accessToken,
    });
  },

  async uploadAvatar(accessToken: string, file: File): Promise<AuthUser> {
    const formData = new FormData();
    formData.append("avatar", file);
    return request<AuthUser>("/users/me/avatar", {
      method: "POST",
      accessToken,
      body: formData,
    });
  },

  async updateProfile(accessToken: string, payload: UpdateProfilePayload): Promise<AuthUser> {
    return request<AuthUser>("/users/me", {
      method: "PATCH",
      accessToken,
      body: payload,
    });
  },

  async getRecentProgress(accessToken: string): Promise<RecentProgressItem[]> {
    return request<RecentProgressItem[]>("/users/me/recent-progress", {
      method: "GET",
      accessToken,
    });
  },

  async getSchedule(accessToken: string, dateFrom: string, dateTo: string): Promise<ScheduleWorkoutItem[]> {
    return request<ScheduleWorkoutItem[]>(`/workouts/schedule?date_from=${dateFrom}&date_to=${dateTo}`, {
      method: "GET",
      accessToken,
    });
  },
};
