import { useState, useRef, useEffect } from 'react';
import styles from './Styles.module.scss';
import { Button } from '@/Components/UI/Button/Button';
import cn from 'classnames';

export const SettingsTab = () => {
  const [workoutName, setWorkoutName] = useState('');
  const [startType, setStartType] = useState<'now' | 'schedule'>('now');
  const [notes, setNotes] = useState('');
  const [selectedTemplate, _] = useState<string | null>(null); //setSelectedTemplate
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Для плавающего индикатора
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<Record<'now' | 'schedule', HTMLButtonElement | null>>({
    now: null,
    schedule: null,
  });

  useEffect(() => {
    const activeElement = tabsRef.current[startType];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [startType]);

  // Установка даты по умолчанию (сегодня)
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setScheduleDate(`${year}-${month}-${day}`);
    setScheduleTime('19:30');
  }, []);

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

      {/* Начать сейчас или запланировать */}
      <div className={cn(styles.section, styles.scheduleSection)}>
        <h3 className={styles.sectionTitle}>Начать сейчас или запланировать</h3>
        
        <div className={styles.startTabsWrapper}>
          <div className={styles.startTabs}>
            <button
              ref={(el) => { tabsRef.current.now = el; }}
              className={cn(styles.startTab, startType === 'now' && styles.startTab_active)}
              onClick={() => setStartType('now')}
            >
              Сейчас
            </button>
            <button
              ref={(el) => { tabsRef.current.schedule = el; }}
              className={cn(styles.startTab, startType === 'schedule' && styles.startTab_active)}
              onClick={() => setStartType('schedule')}
            >
              Запланировать
            </button>
            <div 
              className={styles.indicator} 
              style={{ 
                left: `${indicatorStyle.left}px`, 
                width: `${indicatorStyle.width}px` 
              }} 
            />
          </div>
        </div>

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


    </div>
  );
};