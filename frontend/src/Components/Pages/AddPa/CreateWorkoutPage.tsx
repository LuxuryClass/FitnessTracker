import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Styles.module.scss';
import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { SettingsTab } from './components/SettingsTab/SettingsTabs';
import { Button } from '@/Components/UI/Button/Button';
import { TabsGroup } from '@/Components/UI/TabsGroup/TabsGroup';
import ExercisesTabs from './components/ExercisesTabs/ExercisesTabs';
import { PreviewTab } from './components/PreviewTab/PreviewTab';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { useCreateWorkoutMutation } from '@/hooks/useCreateWorkoutMutation';
import type { Exercise, ExerciseSet, WorkoutCreatePayload } from '@/Auth/authApi';

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
  exerciseOrder: string[];
  exerciseSets: Record<string, ExerciseSet[]>;
}

// Подмножество настроек тренировки, которое надо прокидывать через navigate-state
export type WorkoutFormSettings = Pick<WorkoutFormData,
  'workoutName' | 'startType' | 'notes' | 'scheduleDate' | 'scheduleTime' | 'selectedTemplate'
>;

const CreateWorkoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const passedDate = (location.state as any)?.scheduleDate as Date | undefined;
  const passedStartType = (location.state as any)?.startType as string | undefined;
  const passedActiveTab = (location.state as any)?.activeTab as TabType | undefined;
  const returnedSelectedExercises = (location.state as any)?.selectedExercises as Record<string, string[]> | undefined;
  const returnedExerciseSets = (location.state as any)?.exerciseSets as Record<string, ExerciseSet[]> | undefined;
  const returnedExerciseSearchQuery = (location.state as any)?.exerciseSearchQuery as string | undefined;
  const returnedFormSettings = (location.state as any)?.formSettings as WorkoutFormSettings | undefined;

  const [activeTab, setActiveTab] = useState<TabType>('settings');
  // Поисковый запрос на сетке категорий — живёт в корне, чтобы переход в /exercises/:id
  // и обратно сохранял запрос (между переходами по табам и навигацией).
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState<string>('');

  const { data: allExercises = [] } = useExercisesQuery();
  const createWorkoutMutation = useCreateWorkoutMutation();

  const [formData, setFormData] = useState<WorkoutFormData>(() => ({
    workoutName: returnedFormSettings?.workoutName ?? '',
    startType: returnedFormSettings?.startType ?? 'now',
    notes: returnedFormSettings?.notes ?? '',
    scheduleDate: returnedFormSettings?.scheduleDate ?? '',
    scheduleTime: returnedFormSettings?.scheduleTime ?? '19:30',
    selectedTemplate: returnedFormSettings?.selectedTemplate ?? null,
    selectedExercises: {},
    exerciseOrder: [],
    exerciseSets: {},
  }));

  useLayoutEffect(() => {
    const updateNavHeight = () => {
      const nav = document.querySelector('.bottom-nav');
      if (nav) {
        const height = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--nav-bottom', `${height + 36}px`);
      } else {
        document.documentElement.style.setProperty('--nav-bottom', '86px');
      }
    };

    updateNavHeight();

    const nav = document.querySelector('.bottom-nav');
    let observer: ResizeObserver | null = null;
    if (nav) {
      observer = new ResizeObserver(updateNavHeight);
      observer.observe(nav);
    }

    window.addEventListener('resize', updateNavHeight);
    return () => {
      window.removeEventListener('resize', updateNavHeight);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (returnedFormSettings) return;
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
  }, [passedDate, returnedFormSettings]);

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

  // Принимаем обновлённый список выбранных упражнений с экрана выбора группы.
  useEffect(() => {
    if (returnedSelectedExercises) {
      setFormData(prev => {
        const flatIds = Object.values(returnedSelectedExercises).flat();
        // Сохраняем порядок: сначала ранее зафиксированные id, которые остались выбраны;
        // затем — новые id в порядке появления.
        const stillSelected = prev.exerciseOrder.filter(id => flatIds.includes(id));
        const newOnes = flatIds.filter(id => !stillSelected.includes(id));
        return {
          ...prev,
          selectedExercises: returnedSelectedExercises,
          exerciseOrder: [...stillSelected, ...newOnes],
        };
      });
    }
  }, [returnedSelectedExercises]);

  // Принимаем введённые подходы с экрана выбора (ключ — id упражнения).
  useEffect(() => {
    if (returnedExerciseSets) {
      setFormData(prev => ({
        ...prev,
        exerciseSets: returnedExerciseSets,
      }));
    }
  }, [returnedExerciseSets]);

  // Подхватываем поисковый запрос, который пользователь оставил на /exercises/:id.
  useEffect(() => {
    if (returnedExerciseSearchQuery !== undefined) {
      setExerciseSearchQuery(returnedExerciseSearchQuery);
    }
  }, [returnedExerciseSearchQuery]);

  const updateFormData = useCallback(<K extends keyof WorkoutFormData>(
    key: K,
    value: WorkoutFormData[K] | ((prev: WorkoutFormData[K]) => WorkoutFormData[K])
  ) => {
    setFormData(prev => ({
      ...prev,
      [key]: typeof value === 'function' ? (value as Function)(prev[key]) : value,
    }));
  }, []);

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of allExercises) map.set(ex.id, ex);
    return map;
  }, [allExercises]);

  const orderedSelectedExercises = useMemo<Exercise[]>(() => {
    const ids = formData.exerciseOrder.length > 0
      ? formData.exerciseOrder
      : Object.values(formData.selectedExercises).flat();
    return ids
      .map(id => exerciseById.get(id))
      .filter((ex): ex is Exercise => ex !== undefined);
  }, [formData.exerciseOrder, formData.selectedExercises, exerciseById]);

  const handlePreviewReorder = useCallback((reordered: Exercise[]) => {
    setFormData(prev => ({
      ...prev,
      exerciseOrder: reordered.map(ex => ex.id),
    }));
  }, []);

  // Эффективное название: введённое пользователем, либо «Тренировка» по умолчанию.
  const effectiveTitle = useMemo(() => {
    return formData.workoutName.trim() || 'Тренировка';
  }, [formData.workoutName]);

  const isSaveDisabled =
    orderedSelectedExercises.length === 0
    || createWorkoutMutation.isPending;

  const handleSave = async () => {
    if (isSaveDisabled) return;

    // Упражнение может оказаться в нескольких группах — дедупим по id,
    // иначе бэкенд отклонит дубли exercise_id (422).
    const seen = new Set<string>();
    const uniqueExercises = orderedSelectedExercises.filter(ex => {
      if (seen.has(ex.id)) return false;
      seen.add(ex.id);
      return true;
    });

    const payload: WorkoutCreatePayload = {
      title: effectiveTitle,
      is_planned: formData.startType === 'schedule',
      planned_for: formData.startType === 'schedule'
        ? new Date(`${formData.scheduleDate}T${formData.scheduleTime}:00`).toISOString()
        : null,
      description: formData.notes.trim() || null,
      exercises: uniqueExercises.map(ex => {
        const sets = formData.exerciseSets[ex.id];
        return {
          exercise_id: ex.id,
          target_sets: sets && sets.length > 0
            ? sets.map((s, i) => ({
                set_index: i + 1,
                target_reps: s.reps > 0 ? s.reps : null,
                target_weight_kg: s.weight,
              }))
            : null,
        };
      }),
    };

    try {
      await createWorkoutMutation.mutateAsync(payload);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить тренировку';
      alert(message);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SettingsTab formData={formData} updateFormData={updateFormData} />;
      case 'exercises':
        return (
          <ExercisesTabs
            selectedExercises={formData.selectedExercises}
            exerciseSets={formData.exerciseSets}
            formSettings={{
              workoutName: formData.workoutName,
              startType: formData.startType,
              notes: formData.notes,
              scheduleDate: formData.scheduleDate,
              scheduleTime: formData.scheduleTime,
              selectedTemplate: formData.selectedTemplate,
            }}
            onExercisesChange={(updater) => updateFormData('selectedExercises', updater)}
            initialSearchQuery={exerciseSearchQuery}
            onSearchQueryChange={setExerciseSearchQuery}
          />
        );
      case 'preview':
        return (
          <PreviewTab
            workoutName={effectiveTitle}
            date={formData.startType === 'schedule' ? formData.scheduleDate : undefined}
            time={formData.startType === 'schedule' ? formData.scheduleTime : undefined}
            exercises={orderedSelectedExercises}
            setsByExerciseId={formData.exerciseSets}
            onReorder={handlePreviewReorder}
          />
        );
      default:
        return <SettingsTab formData={formData} updateFormData={updateFormData} />;
    }
  };

  const buttonLabel = createWorkoutMutation.isPending
    ? 'Сохраняем...'
    : formData.startType === 'now' ? 'Начать' : 'Запланировать';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание тренировки</h1>
        <TabsGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>

      <Button
        className={styles.create_button}
        size="l"
        fullWidth
        onClick={handleSave}
        disabled={isSaveDisabled}
      >
        {buttonLabel}
      </Button>
    </div>
  );
};

export default CreateWorkoutPage;
