import styles from './Styles.module.scss';
import { Button } from '@/Components/UI/Button/Button';
import { TemplateCard } from '@/Components/Common/TemplateCard/TemplateCard';
import { WorkoutFormData } from '../../CreateWorkoutPage';
import { WhenWorkoutBlock } from '../WhenWorkoutBlock/WhenWorkoutBlock';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface SettingsTabProps {
  formData: WorkoutFormData;
  updateFormData: <K extends keyof WorkoutFormData>(key: K, value: WorkoutFormData[K]) => void;
}

export const SettingsTab = ({ formData, updateFormData }: SettingsTabProps) => {
  const navigate = useNavigate();

  const handleClearTemplate = () => {
    updateFormData('selectedTemplate', null);
    updateFormData('selectedTemplateData', null);
    updateFormData('workoutName', '');
    updateFormData('notes', '');
    updateFormData('selectedExercises', {});
    updateFormData('exerciseOrder', []);
    updateFormData('exerciseSets', {});
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData('notes', e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }, [formData.notes]);

  const hasData = 
    formData.workoutName.trim() !== '' ||
    formData.notes.trim() !== '' ||
    Object.keys(formData.selectedExercises).length > 0;

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
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Добавьте заметки к этой тренировке"
          value={formData.notes}
          onChange={handleTextareaChange}
          rows={1}
        />
      </div>

      <WhenWorkoutBlock formData={formData} updateFormData={updateFormData} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Из шаблона</h3>

        {formData.selectedTemplateData ? (
          <div className={styles.templateSelected}>
            <div className={styles.templateHeader}>
              <TemplateCard
                template={formData.selectedTemplateData}
                isSelected={false}
                onSelect={() => {}}          
                className={styles.templateCardInner}
                showArrow={false}
              />
              <button
                className={styles.templateRemove}
                onClick={handleClearTemplate}
                aria-label="Убрать шаблон"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <Button
              size="s"
              color="accent"
              fullWidth
              onClick={() => navigate('/templates', { state: { hasData } })}
              className={styles.changeTemplateBtn}
            >
              Сменить шаблон
            </Button>
          </div>
        ) : (
          <div className={styles.templateEmpty}>
            <span className={styles.templatePlaceholder}>Нет выбранного шаблона</span>
            <Button
              size="s"
              color="accent"
              fullWidth
              onClick={() => navigate('/templates', { state: { hasData } })}
              className={styles.addTemplateBtn}
            >
              Выбрать шаблон
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};