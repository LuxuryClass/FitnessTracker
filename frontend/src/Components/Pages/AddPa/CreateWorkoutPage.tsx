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
import { useCreateWorkoutsBatchMutation } from '@/hooks/useCreateWorkoutsBatchMutation';
import type { Exercise, ExerciseSet, WorkoutCreatePayload, WorkoutBatchCreatePayload } from '@/Auth/authApi';
import {
  toPlannedForIso,
  generateRecurringDates,
  formatRepeatEndLabel,
  type ScheduleDateEntry,
  type RepeatEnd,
  type SchedulePreview,
} from './scheduleDates';
import type { Template } from '@/Components/Pages/TemplatesPage/TemplatesPage';

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
  scheduleDates: ScheduleDateEntry[];
  activeDateKey: string | null;
  repeatEnabled: boolean;
  repeatWeekdays: number[];
  repeatEnd: RepeatEnd;
  selectedTemplate: string | null;
  selectedTemplateData: Template | null;
  selectedExercises: Record<string, string[]>;
  exerciseOrder: string[];
  exerciseSets: Record<string, ExerciseSet[]>;
}

// Подмножество настроек тренировки, которое надо прокидывать через navigate-state
export type WorkoutFormSettings = Pick<WorkoutFormData,
  'workoutName' | 'startType' | 'notes' | 'scheduleDate' | 'scheduleTime' | 'selectedTemplate' | 'selectedTemplateData'
  | 'scheduleDates' | 'activeDateKey' | 'repeatEnabled' | 'repeatWeekdays' | 'repeatEnd'
>;

const CreateWorkoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const passedDate = (location.state as any)?.scheduleDate as Date | undefined;
  const passedStartType = (location.state as any)?.startType as string | undefined;
  const passedActiveTab = (location.state as any)?.activeTab as TabType | undefined;
  const passedTemplateData = (location.state as any)?.templateData as {
    template: Template;
    exercises: { exerciseId: string; sets: { reps: number; weight: number }[] }[];
  } | undefined;
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
  const createWorkoutsBatchMutation = useCreateWorkoutsBatchMutation();

  const [formData, setFormData] = useState<WorkoutFormData>(() => ({
    workoutName: returnedFormSettings?.workoutName ?? '',
    startType: returnedFormSettings?.startType ?? 'schedule',
    notes: returnedFormSettings?.notes ?? '',
    scheduleDate: returnedFormSettings?.scheduleDate ?? '',
    scheduleTime: returnedFormSettings?.scheduleTime ?? '18:00',
    scheduleDates: returnedFormSettings?.scheduleDates ?? [],
    activeDateKey: returnedFormSettings?.activeDateKey ?? null,
    repeatEnabled: returnedFormSettings?.repeatEnabled ?? false,
    repeatWeekdays: returnedFormSettings?.repeatWeekdays ?? [],
    repeatEnd: returnedFormSettings?.repeatEnd ?? { type: 'forever' },
    selectedExercises: {},
    exerciseOrder: [],
    exerciseSets: {},
    selectedTemplate: returnedFormSettings?.selectedTemplate ?? null,
    selectedTemplateData: returnedFormSettings?.selectedTemplateData ?? null,
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
    if (!passedTemplateData) return;

    const { template } = passedTemplateData;

    setFormData(prev => {
      const selectedExercises: Record<string, string[]> = {};
      const exerciseSets: Record<string, ExerciseSet[]> = {};
      const exerciseOrder: string[] = [];

      for (const ex of passedTemplateData.exercises) {
        const fullExercise = allExercises.find(e => e.id === ex.exerciseId);
        if (!fullExercise) continue;

        const groupKey = fullExercise.primary_muscle_groups[0] ?? 'other';
        if (!selectedExercises[groupKey]) selectedExercises[groupKey] = [];
        selectedExercises[groupKey].push(ex.exerciseId);

        exerciseSets[ex.exerciseId] = ex.sets.map((s, i) => ({
          set_index: i + 1,
          reps: s.reps,
          weight: s.weight,
        }));

        exerciseOrder.push(ex.exerciseId);
      }

      return {
        ...prev,
        workoutName: template.title,
        notes: template.description,
        selectedTemplate: template.title,
        selectedTemplateData: template,
        selectedExercises,
        exerciseSets,
        exerciseOrder,
      };
    });
  }, [passedTemplateData, allExercises]);

useEffect(() => {
  if (returnedSelectedExercises) {
    setFormData(prev => {
      const flatIds = Object.values(returnedSelectedExercises).flat();
      const stillSelected = prev.exerciseOrder.filter(id => flatIds.includes(id));
      const newOnes = flatIds.filter(id => !stillSelected.includes(id));
      return {
        ...prev,
        selectedExercises: returnedSelectedExercises,
        exerciseOrder: [...stillSelected, ...newOnes],
        // Сбрасываем шаблон, если он был
        selectedTemplate: prev.selectedTemplateData ? null : prev.selectedTemplate,
        selectedTemplateData: null,
      };
    });
  }
}, [returnedSelectedExercises]);

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
    setFormData(prev => {
      const newValue = typeof value === 'function' ? (value as Function)(prev[key]) : value;

      // Если шаблон выбран и меняется название, заметки или упражнения — сбрасываем шаблон
      const templateFields: (keyof WorkoutFormData)[] = ['workoutName', 'notes', 'selectedExercises', 'exerciseSets'];
      const shouldClearTemplate = prev.selectedTemplateData !== null && templateFields.includes(key);

      return {
        ...prev,
        [key]: newValue,
        ...(shouldClearTemplate ? { selectedTemplate: null, selectedTemplateData: null } : {}),
      };
    });
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

  const scheduleSummary = useMemo<SchedulePreview | null>(() => {
    if (formData.startType !== 'schedule') return null;

    if (formData.repeatEnabled) {
      const keys = generateRecurringDates(formData.repeatWeekdays, formData.repeatEnd);
      return {
        mode: 'repeat',
        count: keys.length,
        nearestDate: keys[0] ?? null,
        time: formData.scheduleTime,
        weekdays: formData.repeatWeekdays,
        endLabel: formatRepeatEndLabel(formData.repeatEnd),
        dates: [],
      };
    }

    const dates = [...formData.scheduleDates].sort((a, b) => a.date.localeCompare(b.date));
    return {
      mode: 'multi',
      count: dates.length,
      nearestDate: dates[0]?.date ?? null,
      time: dates[0]?.time ?? formData.scheduleTime,
      weekdays: [],
      endLabel: '',
      dates,
    };
  }, [
    formData.startType,
    formData.repeatEnabled,
    formData.repeatWeekdays,
    formData.repeatEnd,
    formData.scheduleDates,
    formData.scheduleTime,
  ]);

  const isSaveDisabled = createWorkoutMutation.isPending || createWorkoutsBatchMutation.isPending;

  // Упражнения тренировки в формате payload (общие для одиночного и batch создания).
  // Дедупим по id — бэкенд отклоняет дубли exercise_id (422).
  const buildExercisesPayload = useCallback(() => {
    const seen = new Set<string>();
    return orderedSelectedExercises
      .filter(ex => {
        if (seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      })
      .map(ex => {
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
      });
  }, [orderedSelectedExercises, formData.exerciseSets]);

  const handleSave = async () => {
    if (isSaveDisabled) return;

    const exercises = buildExercisesPayload();
    const description = formData.notes.trim() || null;

    try {
      if (formData.startType === 'now') {
        const payload: WorkoutCreatePayload = {
          title: effectiveTitle,
          is_planned: false,
          planned_for: null,
          description,
          exercises,
        };
        const created = await createWorkoutMutation.mutateAsync(payload);
        navigate(`/session/${created.id}`);
        return;
      }

      const plannedFor: string[] = formData.repeatEnabled
        ? generateRecurringDates(formData.repeatWeekdays, formData.repeatEnd)
            .map(dateKey => toPlannedForIso(dateKey, formData.scheduleTime))
        : formData.scheduleDates.map(d => toPlannedForIso(d.date, d.time));

      if (plannedFor.length === 0) {
        alert('Выберите хотя бы одну дату.');
        return;
      }

      const batchPayload: WorkoutBatchCreatePayload = {
        title: effectiveTitle,
        description,
        planned_for: plannedFor,
        exercises,
      };
      await createWorkoutsBatchMutation.mutateAsync(batchPayload);
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
              selectedTemplateData: formData.selectedTemplateData,
              scheduleDates: formData.scheduleDates,
              activeDateKey: formData.activeDateKey,
              repeatEnabled: formData.repeatEnabled,
              repeatWeekdays: formData.repeatWeekdays,
              repeatEnd: formData.repeatEnd,
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
            schedule={scheduleSummary}
            exercises={orderedSelectedExercises}
            setsByExerciseId={formData.exerciseSets}
            onReorder={handlePreviewReorder}
          />
        );
      default:
        return <SettingsTab formData={formData} updateFormData={updateFormData} />;
    }
  };

  const buttonLabel = isSaveDisabled
    ? 'Сохраняем...'
    : formData.startType === 'now'
      ? 'Начать'
      : scheduleSummary && scheduleSummary.count > 1
        ? `Запланировать · ${scheduleSummary.count}`
        : 'Запланировать';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание тренировки</h1>
        <TabsGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>

      <div className={styles.buttons}>
        <Button
          className={styles.create_button}
          size="l"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          {buttonLabel}
        </Button>

        <Button
          className={styles.save_button}
          size="l"
          color="accent"
          onClick={handleSave}
          disabled={true}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
};

export default CreateWorkoutPage;
