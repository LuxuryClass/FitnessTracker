import { useEffect, useMemo, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import styles from './Styles.module.scss';
import cn from 'classnames';
import { DefaultExerciseRow } from '../../../../Common/DefaultExerciseRow/DefaultExerciseRow';
import { PreviewCard } from '@/Components/Common/PreviewCard/PreviewCard';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import type { Exercise, ExerciseSet } from '@/Auth/authApi';
import { labelForPrimary, labelsForPrimaryList, labelsForSecondaryList, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import { WEEKDAY_UI_ORDER, WEEKDAY_LABELS, formatDateLabel, type SchedulePreview } from '../../scheduleDates';
import { useAuth } from '@/Auth';

const MINUTES_PER_SET = 5;

interface PreviewTabProps {
  workoutName: string;
  exercises: Exercise[];
  setsByExerciseId: Record<string, ExerciseSet[]>;
  schedule?: SchedulePreview | null;
  onReorder?: (exercises: Exercise[]) => void;
}

export const PreviewTab = ({
  workoutName,
  exercises,
  setsByExerciseId,
  schedule,
  onReorder,
}: PreviewTabProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Exercise[]>(exercises);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  const muscleGroups = useMemo(() => {
    const set = new Set<string>();
    for (const ex of items) {
      for (const g of ex.primary_muscle_groups) set.add(g);
    }
    return Array.from(set).map(labelForPrimary);
  }, [items]);

  const muscleFocusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of items) {
      const secondary = new Set(ex.secondary_muscles);
      const slugs = new Set<string>();
      const claimed = new Set<string>();
      for (const g of ex.primary_muscle_groups) {
        const groupSlugs = PRIMARY_TO_SECONDARY[g] ?? [];
        const groupSecondary = groupSlugs.filter((s) => secondary.has(s));
        if (groupSecondary.length > 0) {
          for (const s of groupSecondary) { slugs.add(s); claimed.add(s); }
        } else {
          for (const s of groupSlugs) slugs.add(s);
        }
      }
      for (const s of secondary) if (!claimed.has(s)) slugs.add(s);
      for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return Array.from(counts, ([muscle, intensity]) => ({ muscle, intensity }));
  }, [items]);

  const exercisesCount = items.length;

  const duration = useMemo(() => {
    const totalSets = items.reduce(
      (acc, ex) => acc + (setsByExerciseId[ex.id]?.length ?? 0),
      0,
    );
    return `${totalSets * MINUTES_PER_SET}`;
  }, [items, setsByExerciseId]);

  const totalWeight = useMemo(() => {
    const kg = items.reduce((acc, ex) => {
      const sets = setsByExerciseId[ex.id] ?? [];
      return acc + sets.reduce((s, set) => s + set.weight * set.reps, 0);
    }, 0);
    const tons = (kg / 1000).toFixed(1);
    return tons.endsWith('.0') ? tons.slice(0, -2) : tons;
  }, [items, setsByExerciseId]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(overIndex, 0, removed);
      setItems(newItems);
      onReorder?.(newItems);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleModalConfirm = (sets: ExerciseSet[], _description: string) => {
    if (modalExercise) {
      setsByExerciseId[modalExercise.id] = sets;
    }
    setModalExercise(null);
  };

  const cardBadge = schedule && schedule.count > 1 ? `${schedule.count} тренировок` : undefined;
  const cardDate = schedule && schedule.count === 1 ? schedule.nearestDate ?? undefined : undefined;
  const cardTime = schedule && schedule.count === 1 ? schedule.time : undefined;

  return (
    <div className={styles.tab}>
      <PreviewCard
        title={workoutName || 'Новая тренировка'}
        duration={duration}
        totalWeight={totalWeight}
        exercisesCount={exercisesCount}
        date={cardDate}
        time={cardTime}
        badge={cardBadge}
        muscleGroups={muscleGroups}
      />

      {schedule && schedule.count > 1 && (
        <div className={styles.scheduleSummary}>
          {schedule.mode === 'multi' ? (
            <>
              <h3 className={styles.summaryTitle}>Запланированные даты</h3>
              <div className={styles.dateList}>
                {schedule.dates.map((d, i) => (
                  <div key={d.date} className={styles.dateItem}>
                    {i === 0 && <span className={styles.nearestDot} />}
                    <span className={styles.dateText}>{formatDateLabel(d.date)}</span>
                    <span className={styles.dateTime}>{d.time}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className={styles.summaryTitle}>Расписание</h3>
              <div className={styles.weekdayChips}>
                {WEEKDAY_UI_ORDER.map((wd, i) => (
                  <span
                    key={wd}
                    className={cn(styles.weekdayChip, schedule.weekdays.includes(wd) && styles.weekdayChip_active)}
                  >
                    {WEEKDAY_LABELS[i]}
                  </span>
                ))}
              </div>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Период</span>
                  <span className={styles.summaryValue}>{schedule.endLabel}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Время</span>
                  <span className={styles.summaryValue}>{schedule.time}</span>
                </div>
                {schedule.nearestDate && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Ближайшая</span>
                    <span className={styles.summaryValue}>
                      <span className={styles.nearestDot} />
                      {formatDateLabel(schedule.nearestDate)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.exercisesSection}>
        <div className={styles.exercisesList}>
          {items.map((exercise, index) => {
            return (
              <DefaultExerciseRow
                key={exercise.id}
                name={exercise.name}
                muscleGroups={labelsForPrimaryList(exercise.primary_muscle_groups)}
                targetMuscles={labelsForSecondaryList(exercise.secondary_muscles)}
                sets={setsByExerciseId[exercise.id] ?? []}
                index={index}
                showDrag={true}
                showImage={true}
                imageUrl={exercise.media.find(m => m.type === 'image')?.url}
                isDragging={dragIndex === index}
                isOver={overIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setModalExercise(exercise)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.accentSection}>
        <h3 className={styles.sectionTitle}>Акцент на мышцы</h3>
        <MuscleAccentComponent gender={user?.gender ?? "male"} data={muscleFocusData} />
      </div>

      {modalExercise && (
        <ExerciseModal
          isOpen={!!modalExercise}
          onClose={() => setModalExercise(null)}
          name={modalExercise.name}
          muscleGroups={labelsForPrimaryList(modalExercise.primary_muscle_groups)}
          targetMuscles={labelsForSecondaryList(modalExercise.secondary_muscles)}
          equipment={modalExercise.equipment}
          media={modalExercise.media}
          description={modalExercise.description ?? ''}
          sets={setsByExerciseId[modalExercise.id] ?? []}
          editable={true}
          onConfirm={handleModalConfirm}
          showSaveButton={true}
        />
      )}
    </div>
  );
};