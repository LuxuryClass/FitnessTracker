import { useState, useEffect } from 'react';
import styles from './Styles.module.scss';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import cn from 'classnames';
import { WorkoutFormData } from '../../CreateWorkoutPage';


type StartType = 'now' | 'schedule';

const startTabs = [
  { id: 'now' as StartType, label: 'Сейчас' },
  { id: 'schedule' as StartType, label: 'Запланировать' },
];

interface SettingsTabProps {
  formData: WorkoutFormData;
  updateFormData: <K extends keyof WorkoutFormData>(key: K, value: WorkoutFormData[K]) => void;
}

export const SettingsTab = ({ formData, updateFormData }: SettingsTabProps) => {
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(formData.startType === 'schedule');

  useEffect(() => {
    setScheduleDropdownOpen(formData.startType === 'schedule');
  }, [formData.startType]);

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className={styles.tab}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Название тренировки</h3>
        <input
          type="text"
          value={formData.workoutName}
          onChange={(e) => updateFormData('workoutName', e.target.value)}
          placeholder="Введите название"
          className={styles.input}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Заметки к тренировке</h3>
        <input
          className={styles.input}
          placeholder="Добавьте заметки к этой тренировке"
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
        />
      </div>

      <div className={cn(styles.section, styles.scheduleSection)}>
        <h3 className={styles.sectionTitle}>Начать сейчас или запланировать</h3>
        <TabsGroup 
          tabs={startTabs} 
          activeTab={formData.startType} 
          onChange={(id) => updateFormData('startType', id)} 
        />

        <div className={cn(styles.scheduleDropdown, scheduleDropdownOpen && styles.scheduleDropdown_open)}>
          <div className={styles.scheduleDropdownInner}>
            <h4 className={styles.scheduleLabel}>Запланировать на</h4>
            <div className={styles.scheduleInputs}>
              <div className={styles.dateInputWrapper}>
                <input
                  type="date"
                  value={formData.scheduleDate}
                  onChange={(e) => updateFormData('scheduleDate', e.target.value)}
                  className={styles.dateInput}
                />
                <span className={styles.dateDisplay}>
                  {formatDateForDisplay(formData.scheduleDate)}
                </span>
              </div>
              <div className={styles.timeInputWrapper}>
                <input
                  type="time"
                  value={formData.scheduleTime}
                  onChange={(e) => updateFormData('scheduleTime', e.target.value)}
                  className={styles.timeInput}
                />
                <span className={styles.timeDisplay}>{formData.scheduleTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Из шаблона</h3>
        <div className={styles.templateSelector}>
          <span className={styles.templatePlaceholder}>
            {formData.selectedTemplate || 'Нет выбранного шаблона'}
          </span>
          <Button className={styles.add_template_button} size="m" color="accent" fullWidth onClick={() => {}}>
            Выбрать шаблон
          </Button>
        </div>
      </div>
    </div>
  );
};