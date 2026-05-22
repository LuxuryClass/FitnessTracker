import { apiRequest } from "@/Auth/authApi";

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  do_not_disturb: boolean;
  reminders: boolean;
  reminder_offset_minutes: number;
}

export interface NotificationSettingsUpdatePayload {
  enabled?: boolean;
  sound?: boolean;
  vibration?: boolean;
  do_not_disturb?: boolean;
  reminders?: boolean;
  reminder_offset_minutes?: number;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface VapidPublicKeyResponse {
  public_key: string;
}

export const notificationsApi = {
  async getSettings(accessToken: string): Promise<NotificationSettings> {
    return apiRequest<NotificationSettings>("/users/me/notifications", {
      method: "GET",
      accessToken,
    });
  },

  async updateSettings(
    accessToken: string,
    payload: NotificationSettingsUpdatePayload,
  ): Promise<NotificationSettings> {
    return apiRequest<NotificationSettings>("/users/me/notifications", {
      method: "PATCH",
      accessToken,
      body: payload,
    });
  },

  async getVapidPublicKey(accessToken: string): Promise<string> {
    const response = await apiRequest<VapidPublicKeyResponse>("/notifications/vapid-public-key", {
      method: "GET",
      accessToken,
    });
    return response.public_key;
  },

  async upsertSubscription(accessToken: string, payload: PushSubscriptionPayload): Promise<void> {
    await apiRequest<void>("/users/me/notifications/subscriptions", {
      method: "POST",
      accessToken,
      body: payload,
    });
  },

  async deleteSubscription(accessToken: string, endpoint: string): Promise<void> {
    await apiRequest<void>("/users/me/notifications/subscriptions", {
      method: "DELETE",
      accessToken,
      body: { endpoint },
    });
  },
};
