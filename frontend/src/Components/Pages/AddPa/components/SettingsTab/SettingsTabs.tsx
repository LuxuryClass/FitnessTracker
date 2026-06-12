import styles from './Styles.module.scss';
import { Button } from '@/Components/UI/Button/Button';
import { WorkoutFormData } from '../../CreateWorkoutPage';
import { WhenWorkoutBlock } from '../WhenWorkoutBlock/WhenWorkoutBlock';

interface SettingsTabProps {
  formData: WorkoutFormData;
  updateFormData: <K extends keyof WorkoutFormData>(key: K, value: WorkoutFormData[K]) => void;
}

export const SettingsTab = ({ formData, updateFormData }: SettingsTabProps) => {
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

      <WhenWorkoutBlock formData={formData} updateFormData={updateFormData} />

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