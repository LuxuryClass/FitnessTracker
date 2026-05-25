import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { Toggle } from '@/Components/UI/Toggle/Toggle';
import { useAuth } from '@/Auth';
import { ApiError } from '@/Auth/authApi';
import {
  notificationsApi,
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  type NotificationSettings as ApiNotificationSettings,
  type NotificationSettingsUpdatePayload,
} from '@/Notifications';
import { useNotificationSettingsQuery } from '@/hooks/useNotificationSettingsQuery';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import styles from './Styles.module.scss';

interface UiSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  doNotDisturb: boolean;
  reminders: boolean;
  reminderTime: string;
}

const minutesToTimeString = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm}`;
};

const timeStringToMinutes = (value: string): number => {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.parseInt(hoursRaw ?? '0', 10) || 0;
  const minutes = Number.parseInt(minutesRaw ?? '0', 10) || 0;
  return Math.max(0, Math.min(1440, hours * 60 + minutes));
};

const apiToUi = (api: ApiNotificationSettings): UiSettings => ({
  enabled: api.enabled,
  sound: api.sound,
  vibration: api.vibration,
  doNotDisturb: api.do_not_disturb,
  reminders: api.reminders,
  reminderTime: minutesToTimeString(api.reminder_offset_minutes),
});

const NotificationsPage = () => {
  const { tokens, user } = useAuth();
  const accessToken = tokens?.accessToken ?? null;
  const queryClient = useQueryClient();
  const queryKey = ['notificationSettings', user?.id] as const;
  const callWithAuth = useAuthenticatedCall();

  const { data: apiSettings, isLoading, error: queryError } = useNotificationSettingsQuery();
  const settings: UiSettings | null = apiSettings ? apiToUi(apiSettings) : null;

  const [error, setError] = useState<string | null>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);


  const patchSettings = async (
    payload: NotificationSettingsUpdatePayload,
    optimisticApi: ApiNotificationSettings,
  ) => {
    if (!accessToken) return;

    queryClient.setQueryData<ApiNotificationSettings>(queryKey, optimisticApi);
    setError(null);
    try {
      await callWithAuth((token) => notificationsApi.updateSettings(token, payload));
    } catch (err) {
      void queryClient.invalidateQueries({ queryKey });
      const message = err instanceof ApiError ? err.message : 'Не удалось сохранить настройки.';
      setError(message);
    }
  };

  // Включение уведомлений: запрос permission -> push subscribe -> upsert на сервер -> PATCH enabled=true.
  const enableNotifications = async (): Promise<void> => {
    if (!accessToken) return;
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        setError('Разрешение на уведомления отклонено.');
        void queryClient.invalidateQueries({ queryKey });
        return;
      }

      const vapidPublicKey = await callWithAuth((token) => notificationsApi.getVapidPublicKey(token));
      const subscription = await subscribeToPush(vapidPublicKey);
      await callWithAuth((token) => notificationsApi.upsertSubscription(token, subscription));
      await callWithAuth((token) => notificationsApi.updateSettings(token, { enabled: true }));
    } catch (err) {
      void queryClient.invalidateQueries({ queryKey });
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось включить уведомления.';
      setError(message);
    }
  };

  // Отключение: unsubscribe -> удалить подписку на сервере -> PATCH enabled=false.
  const disableNotifications = async (): Promise<void> => {
    if (!accessToken) return;
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        try {
          await callWithAuth((token) => notificationsApi.deleteSubscription(token, endpoint));
        } catch (err) {
          // 404 — подписки уже нет на сервере, это норма; остальное пробрасываем.
          if (!(err instanceof ApiError) || err.status !== 404) {
            throw err;
          }
        }
      }
      await callWithAuth((token) => notificationsApi.updateSettings(token, { enabled: false }));
    } catch (err) {
      void queryClient.invalidateQueries({ queryKey });
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось отключить уведомления.';
      setError(message);
    }
  };

  const handleToggleEnabled = () => {
    if (!settings || !apiSettings) return;
    const nextEnabled = !settings.enabled;

    if (nextEnabled && !isPushSupported()) {
      setError('Push-уведомления не поддерживаются в этом браузере.');
      return;
    }

    setError(null);
    const optimisticApi: ApiNotificationSettings = { ...apiSettings, enabled: nextEnabled };
    queryClient.setQueryData<ApiNotificationSettings>(queryKey, optimisticApi);

    if (nextEnabled) {
      void enableNotifications();
    } else {
      void disableNotifications();
    }
  };

  const handleToggleBoolean = (key: 'sound' | 'vibration' | 'doNotDisturb' | 'reminders') => {
    if (!settings || !apiSettings) return;
    const apiKeyMap = {
      sound: 'sound',
      vibration: 'vibration',
      doNotDisturb: 'do_not_disturb',
      reminders: 'reminders',
    } as const;
    const apiKey = apiKeyMap[key];
    const nextValue = !settings[key];
    const optimisticApi: ApiNotificationSettings = { ...apiSettings, [apiKey]: nextValue };
    void patchSettings({ [apiKey]: nextValue }, optimisticApi);
  };

  const handleReminderTimeChange = (value: string) => {
    if (!settings || !apiSettings) return;
    const minutes = timeStringToMinutes(value);
    const optimisticApi: ApiNotificationSettings = { ...apiSettings, reminder_offset_minutes: minutes };
    void patchSettings({ reminder_offset_minutes: minutes }, optimisticApi);
  };

  const handleTimeClick = () => {
    timeInputRef.current?.showPicker?.();
    timeInputRef.current?.click();
  };

  // Ошибка загрузки query показывается так же, как остальные.
  const displayError = error ?? (queryError instanceof Error ? queryError.message : null);

  if (isLoading || !settings) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button size="back" />
          <h1 className={styles.title}>Уведомления</h1>
        </div>
        {displayError && <p className={styles.error}>{displayError}</p>}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Уведомления</h1>
      </div>

      {displayError && <p className={styles.error}>{displayError}</p>}

      {/* Первый список */}
      <div className={styles.list}>
        <div className={styles.item}>
          <span className={styles.itemLabel}>Включить уведомления</span>
          <Toggle checked={settings.enabled} onChange={handleToggleEnabled} />
        </div>
      </div>

      {/* Заголовок */}
      <h3 className={styles.blockTitle}>Уведомления в приложении</h3>

      {/* Второй список */}
      <div className={styles.list}>
        <div className={styles.item}>
          <span className={styles.itemLabel}>Звук</span>
          <Toggle checked={settings.sound} onChange={() => handleToggleBoolean('sound')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Вибрация</span>
          <Toggle checked={settings.vibration} onChange={() => handleToggleBoolean('vibration')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Не беспокоить</span>
          <Toggle checked={settings.doNotDisturb} onChange={() => handleToggleBoolean('doNotDisturb')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Напоминания</span>
          <Toggle checked={settings.reminders} onChange={() => handleToggleBoolean('reminders')} />
        </div>

        {settings.reminders && (
          <div className={`${styles.item} ${settings.reminders ? styles.item_show : styles.item_hide}`}>
            <span className={styles.itemLabel}>Напомнить за</span>
            <div className={styles.timeWrapper} onClick={handleTimeClick}>
              <span className={styles.timeText}>{settings.reminderTime}</span>
              <input
                ref={timeInputRef}
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleReminderTimeChange(e.target.value)}
                className={styles.timeInput}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
