import { useState, useRef } from 'react';
import { Button } from '@/Components/UI/Button/Button';
import { Toggle } from '@/Components/UI/Toggle/Toggle';
import styles from './Styles.module.scss';

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  doNotDisturb: boolean;
  reminders: boolean;
  reminderTime: string;
}

const NotificationsPage = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    vibration: false,
    doNotDisturb: false,
    reminders: true,
    reminderTime: '00:00',
  });

  const timeInputRef = useRef<HTMLInputElement>(null);

  const toggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTimeClick = () => {
    timeInputRef.current?.showPicker?.();
    timeInputRef.current?.click();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" />
        <h1 className={styles.title}>Уведомления</h1>
      </div>

      {/* Первый список */}
      <div className={styles.list}>
        <div className={styles.item}>
          <span className={styles.itemLabel}>Включить уведомления</span>
          <Toggle checked={settings.enabled} onChange={() => toggle('enabled')} />
        </div>
      </div>

      {/* Заголовок */}
      <h3 className={styles.blockTitle}>Уведомления в приложении</h3>

      {/* Второй список */}
      <div className={styles.list}>
        <div className={styles.item}>
          <span className={styles.itemLabel}>Звук</span>
          <Toggle checked={settings.sound} onChange={() => toggle('sound')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Вибрация</span>
          <Toggle checked={settings.vibration} onChange={() => toggle('vibration')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Не беспокоить</span>
          <Toggle checked={settings.doNotDisturb} onChange={() => toggle('doNotDisturb')} />
        </div>

        <div className={styles.item}>
          <span className={styles.itemLabel}>Напоминания</span>
          <Toggle checked={settings.reminders} onChange={() => toggle('reminders')} />
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
                onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
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