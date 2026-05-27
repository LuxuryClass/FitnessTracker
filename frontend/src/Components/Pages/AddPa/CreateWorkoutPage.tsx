import { useLocation } from 'react-router-dom';
import styles from './Styles.module.scss';
import { useState, useEffect, useCallback } from 'react';
import { SettingsTab } from './components/SettingsTab/SettingsTabs';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import ExercisesTabs from './components/ExercisesTabs/ExercisesTabs';
import { PreviewTab } from './components/PreviewTab/PreviewTab';

type TabType = 'settings' | 'exercises' | 'preview';

const tabs = [
  { id: 'settings' as TabType, label: 'Настройки' },
  { id: 'exercises' as TabType, label: 'Упражнения' },
  { id: 'preview' as TabType, label: 'Превью' },
];

export interface WorkoutFormData {
  workoutName: string;
  startType: 'now' | 'schedule';
  notes: string;
  scheduleDate: string;
  scheduleTime: string;
  selectedTemplate: string | null;
  selectedExercises: Record<string, string[]>;
}

const CreateWorkoutPage = () => {
  const location = useLocation();
  const passedDate = (location.state as any)?.scheduleDate as Date | undefined;
  const passedStartType = (location.state as any)?.startType as string | undefined;
  const passedActiveTab = (location.state as any)?.activeTab as TabType | undefined;

  const [activeTab, setActiveTab] = useState<TabType>('settings');

  const [formData, setFormData] = useState<WorkoutFormData>({
    workoutName: '',
    startType: 'now',
    notes: '',
    scheduleDate: '',
    scheduleTime: '19:30',
    selectedTemplate: null,
    selectedExercises: {},
  });

  useEffect(() => {
    const date = passedDate || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setFormData(prev => ({
      ...prev,
      scheduleDate: `${year}-${month}-${day}`,
      scheduleTime: `${hours}:${minutes}`,
    }));
  }, [passedDate]);

  useEffect(() => {
    if (passedActiveTab === 'exercises') {
      setActiveTab('exercises');
    }
  }, [passedActiveTab]);
  
  useEffect(() => {
    if (passedStartType === 'schedule') {
      setFormData(prev => ({ ...prev, startType: 'schedule' }));
    }
  }, [passedStartType]);

  const updateFormData = useCallback(<K extends keyof WorkoutFormData>(
    key: K,
    value: WorkoutFormData[K] | ((prev: WorkoutFormData[K]) => WorkoutFormData[K])
  ) => {
    setFormData(prev => ({
      ...prev,
      [key]: typeof value === 'function' ? (value as Function)(prev[key]) : value,
    }));
  }, []);

  const handleSave = () => {
    console.log('Сохраняем тренировку:', formData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsTab 
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 'exercises':
        return (
          <ExercisesTabs 
            selectedExercises={formData.selectedExercises}
            onExercisesChange={(updater) => updateFormData('selectedExercises', updater)}
          />
        );
      case 'preview':
        return (
          <PreviewTab
            workoutName={formData.workoutName}
            date={formData.startType === 'schedule' ? formData.scheduleDate : undefined}
            time={formData.startType === 'schedule' ? formData.scheduleTime : undefined}
            exercises={[
              { id: '1', name: 'Жим лежа', muscleGroup: 'Грудь' },
              { id: '2', name: 'Жим гантелей', muscleGroup: 'Грудь' },
              { id: '3', name: 'Махи гантелями', muscleGroup: 'Плечи' },
            ]}
            onReorder={(items) => console.log('Новый порядок:', items)}
          />
        );
      default:
        return <SettingsTab formData={formData} updateFormData={updateFormData} />;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание тренировки</h1>
        <TabsGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>

      <Button className={styles.create_button} size="l" fullWidth onClick={handleSave}>
        {formData.startType === 'now' ? 'Начать' : 'Запланировать'}
      </Button>
    </div>
  );
};

export default CreateWorkoutPage;