const DEFAULT_API_BASE_URL = "http://localhost:8000/api";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

// В статьях справочника inline-медиа хранится абсолютным путём вида "/api/guide/media/...", 
// поэтому для корректного отображения нужно подставлять origin бэкенда из API_BASE_URL
export const resolveApiUrl = (path: string): string => {
  if (!path.startsWith("/api/")) return path;
  try {
    return `${new URL(API_BASE_URL).origin}${path}`;
  } catch {
    return path;
  }
};

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
  muscle_group: string | null;
  difference_kg: number | string;
  recent_max_weight_kg: number | string;
  previous_max_weight_kg: number | string | null;
}

export interface WeeklyMuscleFocusItem {
  muscle: string;
  intensity: number;
}

export interface NextWorkoutExerciseItem {
  name: string;
  muscle_groups: string[];
  order_index: number;
  sets_count: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight_kg_min: number | string | null;
  target_weight_kg_max: number | string | null;
}

export interface NextWorkoutResponse {
  id: string;
  title: string;
  planned_for: string;
  estimated_duration_minutes: number | null;
  exercises_count: number;
  muscle_groups: string[];
  exercises: NextWorkoutExerciseItem[];
  is_active: boolean;
}

export interface ExerciseMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

export interface Exercise {
  id: string;
  created_by_user_id: string | null;
  name: string;
  description: string | null;
  primary_muscle_groups: string[];
  secondary_muscles: string[];
  equipment: string[];
  is_favorite: boolean;
  media: ExerciseMediaItem[];
  created_at: string;
  updated_at: string;
}

export interface ExerciseCreatePayload {
  name: string;
  description: string | null;
  primary_muscle_groups: string[];
  secondary_muscles: string[];
  equipment: string[];
}

export interface ExerciseSet {
  weight: number;
  reps: number;
}

export interface WorkoutTargetSetItem {
  set_index: number;
  target_reps: number | null;
  target_weight_kg: string | number | null;
}

export interface WorkoutExerciseCreateItem {
  exercise_id: string;
  target_sets: WorkoutTargetSetItem[] | null;
}

export interface WorkoutCreatePayload {
  title: string;
  is_planned: boolean;
  planned_for: string | null;
  description: string | null;
  exercises: WorkoutExerciseCreateItem[];
}

export interface WorkoutCreateResponse {
  id: string;
  title: string;
  is_planned: boolean;
  planned_for: string | null;
  description: string | null;
}

export interface WorkoutBatchCreatePayload {
  title: string;
  description: string | null;
  planned_for: string[];
  exercises: WorkoutExerciseCreateItem[];
}

export interface WorkoutExerciseItem {
  exercise_id: string;
  order_index: number;
  target_sets: WorkoutTargetSetItem[];
}

export interface Workout {
  id: string;
  title: string;
  is_planned: boolean;
  is_completed: boolean;
  planned_for: string | null;
  series_id: string | null;
  description: string | null;
  exercises: WorkoutExerciseItem[];
}

// Частичное обновление: передаются только изменяемые поля
export interface WorkoutUpdatePayload {
  title?: string;
  description?: string | null;
  exercises?: WorkoutExerciseCreateItem[];
}

export interface WorkoutTemplateExerciseItem {
  exercise_id: string;
  order_index: number;
}

export interface WorkoutTemplate {
  id: string;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  is_favorite: boolean;
  exercises: WorkoutTemplateExerciseItem[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateCreatePayload {
  title: string;
  description: string | null;
  exercises: { exercise_id: string }[];
}

export interface WorkoutTemplateUpdatePayload {
  title?: string;
  description?: string | null;
  exercises?: { exercise_id: string }[];
}

export interface GuideCategoryListItem {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  articles_count: number;
  updated_at: string;
}

export interface GuideArticleListItem {
  id: string;
  title: string;
  description: string | null;
  icon_url: string | null;
  reading_time_minutes: number;
  views_count: number;
  is_favorite: boolean;
}

export interface GuideArticleResponse {
  id: string;
  guide_category_id: string;
  title: string;
  description: string | null;
  icon_url: string | null;
  reading_time_minutes: number;
  views_count: number;
  is_favorite: boolean;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSessionSetItem {
  id: string;
  exercise_id: string;
  client_event_id: string;
  set_index: number;
  weight_kg: number | string;
  reps: number;
}

export interface WorkoutSession {
  id: string;
  workout_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  sets: WorkoutSessionSetItem[];
}

export interface WorkoutSessionSetPayload {
  exercise_id: string;
  client_event_id: string;
  set_index: number;
  weight_kg: number;
  reps: number;
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

  async getWeeklyMuscleFocus(accessToken: string): Promise<WeeklyMuscleFocusItem[]> {
    return request<WeeklyMuscleFocusItem[]>("/users/me/weekly-muscle-focus", {
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

  async getNextWorkout(accessToken: string): Promise<NextWorkoutResponse | null> {
    return request<NextWorkoutResponse | null>("/workouts/next", {
      method: "GET",
      accessToken,
    });
  },

  async getExercises(accessToken: string): Promise<Exercise[]> {
    return request<Exercise[]>("/exercises", {
      method: "GET",
      accessToken,
    });
  },

  async getSystemExercises(accessToken: string): Promise<Exercise[]> {
    return request<Exercise[]>("/exercises/system", {
      method: "GET",
      accessToken,
    });
  },

  async createExercise(accessToken: string, payload: ExerciseCreatePayload): Promise<Exercise> {
    return request<Exercise>("/exercises", {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async uploadExerciseMedia(accessToken: string, exerciseId: string, file: File): Promise<Exercise> {
    const formData = new FormData();
    formData.append("media", file);
    return request<Exercise>(`/exercises/${exerciseId}/media`, {
      method: "POST",
      accessToken,
      body: formData,
    });
  },

  async deleteExerciseMedia(accessToken: string, exerciseId: string, mediaId: string): Promise<Exercise> {
    return request<Exercise>(`/exercises/${exerciseId}/media/${mediaId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  async addExerciseFavorite(accessToken: string, exerciseId: string): Promise<void> {
    return request<void>(`/exercises/${exerciseId}/favorite`, {
      method: "POST",
      accessToken,
    });
  },

  async removeExerciseFavorite(accessToken: string, exerciseId: string): Promise<void> {
    return request<void>(`/exercises/${exerciseId}/favorite`, {
      method: "DELETE",
      accessToken,
    });
  },

  async createWorkout(accessToken: string, payload: WorkoutCreatePayload): Promise<WorkoutCreateResponse> {
    return request<WorkoutCreateResponse>("/workouts", {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async createWorkoutsBatch(accessToken: string, payload: WorkoutBatchCreatePayload): Promise<WorkoutCreateResponse[]> {
    return request<WorkoutCreateResponse[]>("/workouts/batch", {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async getWorkout(accessToken: string, workoutId: string): Promise<Workout> {
    return request<Workout>(`/workouts/${workoutId}`, {
      method: "GET",
      accessToken,
    });
  },

  async updateWorkout(accessToken: string, workoutId: string, payload: WorkoutUpdatePayload): Promise<Workout> {
    return request<Workout>(`/workouts/${workoutId}`, {
      method: "PATCH",
      accessToken,
      body: payload,
    });
  },

  async deleteWorkout(
    accessToken: string,
    workoutId: string,
    scope: "this" | "following" | "all" = "this",
  ): Promise<void> {
    return request<void>(`/workouts/${workoutId}?scope=${scope}`, {
      method: "DELETE",
      accessToken,
    });
  },

  async getWorkoutTemplates(accessToken: string): Promise<WorkoutTemplate[]> {
    return request<WorkoutTemplate[]>("/workout-templates", {
      method: "GET",
      accessToken,
    });
  },

  async getWorkoutTemplate(accessToken: string, templateId: string): Promise<WorkoutTemplate> {
    return request<WorkoutTemplate>(`/workout-templates/${templateId}`, {
      method: "GET",
      accessToken,
    });
  },

  async createWorkoutTemplate(accessToken: string, payload: WorkoutTemplateCreatePayload): Promise<WorkoutTemplate> {
    return request<WorkoutTemplate>("/workout-templates", {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async updateWorkoutTemplate(
    accessToken: string,
    templateId: string,
    payload: WorkoutTemplateUpdatePayload,
  ): Promise<WorkoutTemplate> {
    return request<WorkoutTemplate>(`/workout-templates/${templateId}`, {
      method: "PATCH",
      accessToken,
      body: payload,
    });
  },

  async deleteWorkoutTemplate(accessToken: string, templateId: string): Promise<void> {
    return request<void>(`/workout-templates/${templateId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  async addWorkoutTemplateFavorite(accessToken: string, templateId: string): Promise<void> {
    return request<void>(`/workout-templates/${templateId}/favorite`, {
      method: "POST",
      accessToken,
    });
  },

  async removeWorkoutTemplateFavorite(accessToken: string, templateId: string): Promise<void> {
    return request<void>(`/workout-templates/${templateId}/favorite`, {
      method: "DELETE",
      accessToken,
    });
  },

  async startWorkoutSession(accessToken: string, workoutId: string): Promise<WorkoutSession> {
    return request<WorkoutSession>("/workout-sessions/start", {
      method: "POST",
      accessToken,
      body: { workout_id: workoutId },
    });
  },

  async getActiveWorkoutSession(accessToken: string): Promise<WorkoutSession | null> {
    return request<WorkoutSession | null>("/workout-sessions/active", {
      method: "GET",
      accessToken,
    });
  },

  async getCompletedSessionByWorkout(accessToken: string, workoutId: string): Promise<WorkoutSession | null> {
    return request<WorkoutSession | null>(`/workout-sessions/by-workout/${workoutId}`, {
      method: "GET",
      accessToken,
    });
  },

  async upsertWorkoutSessionSet(
    accessToken: string,
    sessionId: string,
    payload: WorkoutSessionSetPayload,
  ): Promise<WorkoutSessionSetItem> {
    return request<WorkoutSessionSetItem>(`/workout-sessions/${sessionId}/sets`, {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async deleteWorkoutSessionSet(accessToken: string, sessionId: string, setId: string): Promise<void> {
    return request<void>(`/workout-sessions/${sessionId}/sets/${setId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  async completeWorkoutSession(accessToken: string, sessionId: string): Promise<WorkoutSession> {
    return request<WorkoutSession>(`/workout-sessions/${sessionId}/complete`, {
      method: "POST",
      accessToken,
    });
  },

  async getGuideCategories(accessToken: string): Promise<GuideCategoryListItem[]> {
    return request<GuideCategoryListItem[]>("/guide/categories", {
      method: "GET",
      accessToken,
    });
  },

  async getGuideCategoryArticles(accessToken: string, categoryId: string): Promise<GuideArticleListItem[]> {
    return request<GuideArticleListItem[]>(`/guide/categories/${categoryId}/articles`, {
      method: "GET",
      accessToken,
    });
  },

  async getGuideArticle(accessToken: string, articleId: string): Promise<GuideArticleResponse> {
    return request<GuideArticleResponse>(`/guide/articles/${articleId}`, {
      method: "GET",
      accessToken,
    });
  },

  async addGuideArticleFavorite(accessToken: string, articleId: string): Promise<void> {
    return request<void>(`/guide/articles/${articleId}/favorite`, {
      method: "POST",
      accessToken,
    });
  },

  async removeGuideArticleFavorite(accessToken: string, articleId: string): Promise<void> {
    return request<void>(`/guide/articles/${articleId}/favorite`, {
      method: "DELETE",
      accessToken,
    });
  },
};
