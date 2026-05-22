import { useEffect, useRef, useState } from 'react';
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
  const { tokens } = useAuth();
  const accessToken = tokens?.accessToken ?? null;

  const [settings, setSettings] = useState<UiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Загружаем настройки при монтировании.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await notificationsApi.getSettings(accessToken);
        if (!cancelled) {
          setSettings(apiToUi(response));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : 'Не удалось загрузить настройки уведомлений.';
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [accessToken]);

  // Универсальный PATCH с откатом UI при ошибке.
  const patchSettings = async (
    payload: NotificationSettingsUpdatePayload,
    optimistic: UiSettings,
    rollback: UiSettings,
  ) => {
    if (!accessToken) return;
    setSettings(optimistic);
    setIsSaving(true);
    setError(null);
    try {
      const response = await notificationsApi.updateSettings(accessToken, payload);
      setSettings(apiToUi(response));
    } catch (err) {
      setSettings(rollback);
      const message = err instanceof ApiError ? err.message : 'Не удалось сохранить настройки.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Включение уведомлений: запрос permission -> push subscribe -> upsert на сервер -> PATCH enabled=true.
  const enableNotifications = async (current: UiSettings): Promise<void> => {
    if (!accessToken) return;
    if (!isPushSupported()) {
      setError('Push-уведомления не поддерживаются в этом браузере.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        setError('Разрешение на уведомления отклонено.');
        return;
      }

      const vapidPublicKey = await notificationsApi.getVapidPublicKey(accessToken);
      const subscription = await subscribeToPush(vapidPublicKey);
      await notificationsApi.upsertSubscription(accessToken, subscription);

      const response = await notificationsApi.updateSettings(accessToken, { enabled: true });
      setSettings(apiToUi(response));
    } catch (err) {
      setSettings(current);
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось включить уведомления.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Отключение: unsubscribe -> удалить подписку на сервере -> PATCH enabled=false.
  const disableNotifications = async (current: UiSettings): Promise<void> => {
    if (!accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        try {
          await notificationsApi.deleteSubscription(accessToken, endpoint);
        } catch (err) {
          // 404 — подписки уже нет на сервере, это норма; остальное пробрасываем.
          if (!(err instanceof ApiError) || err.status !== 404) {
            throw err;
          }
        }
      }
      const response = await notificationsApi.updateSettings(accessToken, { enabled: false });
      setSettings(apiToUi(response));
    } catch (err) {
      setSettings(current);
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось отключить уведомления.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = () => {
    if (!settings || isSaving) return;
    if (settings.enabled) {
      void disableNotifications(settings);
    } else {
      void enableNotifications(settings);
    }
  };

  const handleToggleBoolean = (key: 'sound' | 'vibration' | 'doNotDisturb' | 'reminders') => {
    if (!settings || isSaving) return;
    const next: UiSettings = { ...settings, [key]: !settings[key] };
    const apiKeyMap = {
      sound: 'sound',
      vibration: 'vibration',
      doNotDisturb: 'do_not_disturb',
      reminders: 'reminders',
    } as const;
    void patchSettings({ [apiKeyMap[key]]: next[key] }, next, settings);
  };

  const handleReminderTimeChange = (value: string) => {
    if (!settings || isSaving) return;
    const next: UiSettings = { ...settings, reminderTime: value };
    const minutes = timeStringToMinutes(value);
    void patchSettings({ reminder_offset_minutes: minutes }, next, settings);
  };

  const handleTimeClick = () => {
    timeInputRef.current?.showPicker?.();
    timeInputRef.current?.click();
  };

  if (isLoading || !settings) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button size="back" />
          <h1 className={styles.title}>Уведомления</h1>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Уведомления</h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}

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
