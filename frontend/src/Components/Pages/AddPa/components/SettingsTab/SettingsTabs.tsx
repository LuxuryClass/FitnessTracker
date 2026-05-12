import { useState, useEffect } from 'react';
import styles from './Styles.module.scss';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import cn from 'classnames';

type StartType = 'now' | 'schedule';

const startTabs = [
  { id: 'now' as StartType, label: 'Сейчас' },
  { id: 'schedule' as StartType, label: 'Запланировать' },
];

interface SettingsTabProps {
  initialStartType?: StartType;
  initialDate?: Date;
}

export const SettingsTab = ({ initialStartType, initialDate }: SettingsTabProps) => {
  const [workoutName, setWorkoutName] = useState('');
  const [startType, setStartType] = useState<StartType>('now');
  const [notes, setNotes] = useState('');
  const [selectedTemplate, _] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
  const date = initialDate || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  setScheduleTime(`${hours}:${minutes}`);
  
  setScheduleDate(`${year}-${month}-${day}`);
  setScheduleTime(`${hours}:${minutes}`); 
}, [initialDate]);

  useEffect(() => {
    if (initialStartType === 'schedule') {
      const timer = setTimeout(() => {
        setStartType('schedule');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialStartType]);

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className={styles.tab}>
      {/* Название тренировки */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Название тренировки</h3>
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="Введите название"
          className={styles.input}
        />
      </div>
      
      {/* Заметки */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Заметки к тренировке</h3>
        <input
          className={styles.input}
          placeholder="Добавьте заметки к этой тренировке"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Начать сейчас или запланировать */}
      <div className={cn(styles.section, styles.scheduleSection)}>
        <h3 className={styles.sectionTitle}>Начать сейчас или запланировать</h3>
        
        <TabsGroup tabs={startTabs} activeTab={startType} onChange={setStartType} />

        {/* Выпадающий блок с датой */}
        <div className={cn(styles.scheduleDropdown, startType === 'schedule' && styles.scheduleDropdown_open)}>
          <div className={styles.scheduleDropdownInner}>
            <h4 className={styles.scheduleLabel}>Запланировать на</h4>
            <div className={styles.scheduleInputs}>
              <div className={styles.dateInputWrapper}>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className={styles.dateInput}
                />
                <span className={styles.dateDisplay}>
                  {formatDateForDisplay(scheduleDate)}
                </span>
              </div>
              <div className={styles.timeInputWrapper}>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className={styles.timeInput}
                />
                <span className={styles.timeDisplay}>
                  {scheduleTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Шаблон */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Из шаблона</h3>
        <div className={styles.templateSelector}>
          <span className={styles.templatePlaceholder}>
            {selectedTemplate || 'Нет выбранного шаблона'}
          </span>
          <Button className={styles.add_template_button} size="m" color="accent" fullWidth onClick={() => {}}>
            Выбрать шаблон
          </Button>
        </div>
      </div>
    </div>
  );
};