import { useMemo, useState } from 'react';
import cn from 'classnames';
import styles from './Styles.module.scss';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import { Toggle } from '@/Components/UI/Toggle/Toggle';
import { MonthCalendar } from '@/Components/Common/MonthCalendar/MonthCalendar';
import { WorkoutFormData } from '../../CreateWorkoutPage';
import {
  WEEKDAY_UI_ORDER,
  WEEKDAY_LABELS,
  generateRecurringDates,
  parseDateKey,
  formatRepeatEndLabel,
  formatDateLabel,
  type ScheduleDateEntry,
} from '../../scheduleDates';

type StartType = 'now' | 'schedule';

const startTabs = [
  { id: 'now' as StartType, label: 'Начать сейчас' },
  { id: 'schedule' as StartType, label: 'Выбрать' },
];

interface WhenWorkoutBlockProps {
  formData: WorkoutFormData;
  updateFormData: <K extends keyof WorkoutFormData>(key: K, value: WorkoutFormData[K]) => void;
}

export const WhenWorkoutBlock = ({ formData, updateFormData }: WhenWorkoutBlockProps) => {
  const isSchedule = formData.startType === 'schedule';
  const [endOpen, setEndOpen] = useState(false);
  const [untilDraft, setUntilDraft] = useState(
    formData.repeatEnd.type === 'until' ? formData.repeatEnd.untilDate : ''
  );
  const [countDraft, setCountDraft] = useState(
    formData.repeatEnd.type === 'count' ? formData.repeatEnd.count : ''
  );

  const handleDayClick = (date: Date) => {
    if (formData.repeatEnabled) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const exists = formData.scheduleDates.some(d => d.date === key);
    if (exists) {
      const next = formData.scheduleDates.filter(d => d.date !== key);
      updateFormData('scheduleDates', next);
      updateFormData('activeDateKey', next.length ? next[next.length - 1].date : null);
    } else {
      const inheritedTime = formData.scheduleDates.length
        ? formData.scheduleDates[formData.scheduleDates.length - 1].time
        : formData.scheduleTime;
      const entry: ScheduleDateEntry = { date: key, time: inheritedTime };
      const next = [...formData.scheduleDates, entry];
      updateFormData('scheduleDates', next);
      updateFormData('activeDateKey', key);
    }
  };

  const activeEntry = useMemo(
    () => formData.scheduleDates.find(d => d.date === formData.activeDateKey) ?? null,
    [formData.scheduleDates, formData.activeDateKey]
  );

  const handleTimeChange = (time: string) => {
    if (formData.repeatEnabled) {
      updateFormData('scheduleTime', time);
      return;
    }
    if (!activeEntry) {
      // Нет выбранных дат — просто запоминаем дефолтное время для будущих.
      updateFormData('scheduleTime', time);
      return;
    }
    const next = formData.scheduleDates.map(d =>
      d.date === activeEntry.date ? { ...d, time } : d
    );
    updateFormData('scheduleDates', next);
  };

  const handleToggleWeekday = (weekday: number) => {
    const set = new Set(formData.repeatWeekdays);
    if (set.has(weekday)) set.delete(weekday);
    else set.add(weekday);
    updateFormData('repeatWeekdays', Array.from(set));
  };

  const recurringKeys = useMemo(
    () =>
      formData.repeatEnabled
        ? generateRecurringDates(formData.repeatWeekdays, formData.repeatEnd)
        : [],
    [formData.repeatEnabled, formData.repeatWeekdays, formData.repeatEnd]
  );

  const markedDates = useMemo<Date[]>(() => {
    if (formData.repeatEnabled) return recurringKeys.map(parseDateKey);
    return formData.scheduleDates.map(d => parseDateKey(d.date));
  }, [formData.repeatEnabled, recurringKeys, formData.scheduleDates]);

  const activeDate = useMemo<Date | null>(
    () => (!formData.repeatEnabled && formData.activeDateKey ? parseDateKey(formData.activeDateKey) : null),
    [formData.repeatEnabled, formData.activeDateKey]
  );

  const selectedCount = formData.repeatEnabled ? recurringKeys.length : formData.scheduleDates.length;
  const timeValue = formData.repeatEnabled ? formData.scheduleTime : (activeEntry?.time ?? formData.scheduleTime);

  const endType = formData.repeatEnd.type;

  // Дефолт для «До даты»: сегодня + 1 месяц
  const defaultUntilDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const selectUntil = () => updateFormData('repeatEnd', { type: 'until', untilDate: untilDraft || defaultUntilDate });
  const selectCount = () => updateFormData('repeatEnd', { type: 'count', count: Number(countDraft) || 1 });

  return (
    <div className={styles.block}>
      <h3 className={styles.sectionTitle}>Когда тренировка</h3>

      <TabsGroup
        tabs={startTabs}
        activeTab={formData.startType}
        onChange={(id) => updateFormData('startType', id)}
      />

      {isSchedule && (
        <div className={styles.body}>
          {!formData.repeatEnabled && (
            <span className={styles.counter}>Выбрано: {selectedCount}</span>
          )}

          <MonthCalendar
            markedDates={markedDates}
            activeDate={activeDate}
            onDayClick={handleDayClick}
          />

          <div className={styles.row}>
            <img src="/icons/Repeat.svg" />
            <span className={styles.rowLabel}>Повторять по дням недели</span>
            <Toggle
              checked={formData.repeatEnabled}
              onChange={(checked) => updateFormData('repeatEnabled', checked)}
            />
          </div>

          {formData.repeatEnabled && (
            <>
              <div className={styles.weekdays}>
                {WEEKDAY_UI_ORDER.map((wd, i) => (
                  <button
                    key={wd}
                    type="button"
                    className={cn(styles.chip, formData.repeatWeekdays.includes(wd) && styles.chip_active)}
                    onClick={() => handleToggleWeekday(wd)}
                  >
                    {WEEKDAY_LABELS[i]}
                  </button>
                ))}
              </div>

              <button type="button" className={styles.endHeader} onClick={() => setEndOpen(o => !o)}>
                <span className={styles.endTitle}>Окончание повторения</span>
                <span className={styles.endValue}>{formatRepeatEndLabel(formData.repeatEnd)}</span>
                <span className={cn(styles.chevron, endOpen && styles.chevron_open)}>›</span>
              </button>

              {endOpen && (
              <div className={styles.endOptions}>
                {/* На 3 месяца */}
                <button
                  type="button"
                  className={cn(styles.endOption, endType === 'forever' && styles.endOption_active)}
                  onClick={() => updateFormData('repeatEnd', { type: 'forever' })}
                >
                  <span className={cn(styles.radio, endType === 'forever' && styles.radio_active)} />
                  <span className={styles.endOptionLabel}>На 3 месяца</span>
                </button>

                {/* До даты */}
                <button
                  type="button"
                  className={cn(styles.endOption, endType === 'until' && styles.endOption_active)}
                  onClick={selectUntil}
                >
                  <span className={cn(styles.radio, endType === 'until' && styles.radio_active)} />
                  <span className={styles.endOptionLabel}>До даты</span>
                  <div className={styles.dateWrapper}>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={untilDraft}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { setUntilDraft(e.target.value); updateFormData('repeatEnd', { type: 'until', untilDate: e.target.value }); }}
                    />
                    <span className={cn(styles.datePill, endType !== 'until' && styles.field_muted)}>
                      {untilDraft ? formatDateLabel(untilDraft) : 'дата'}
                    </span>
                  </div>
                </button>

                {/* После N повторений */}
                <button
                  type="button"
                  className={cn(styles.endOption, endType === 'count' && styles.endOption_active)}
                  onClick={selectCount}
                >
                  <span className={cn(styles.radio, endType === 'count' && styles.radio_active)} />
                  <span className={styles.endOptionLabel}>После N повторений</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="N"
                    className={cn(styles.endNumber, endType !== 'count' && styles.field_muted)}
                    value={countDraft}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') { setCountDraft(''); return; }
                      const n = Math.max(1, Math.min(100, Number(raw) || 1));
                      setCountDraft(n);
                      updateFormData('repeatEnd', { type: 'count', count: n });
                    }}
                  />
                </button>
              </div>
              )}
            </>
          )}

          <div className={styles.timeRow}>
            <span className={styles.rowLabel}>Время для выбранной даты</span>
            <div className={styles.timeWrapper}>
              <input
                type="time"
                className={styles.timeInput}
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
              />
              <span className={styles.timeDisplay}>{timeValue}</span>
              <span className={styles.clockIcon} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};