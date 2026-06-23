import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import ExercisesTabs from '@/Components/Pages/AddPa/components/ExercisesTabs/ExercisesTabs';
import { filterExercisesByCategory } from '@/Components/Pages/AddPa/exerciseFiltering';
import { PRIMARY_MUSCLE_GROUPS } from '@/Utils/muscleGroups';
import { useWorkoutQuery } from '@/hooks/useWorkoutQuery';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { useAuth } from '@/Auth';
import type { ExerciseSet } from '@/Auth/authApi';
import styles from './Styles.module.scss';

const SessionAddExercisesPage = () => {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user } = useAuth();
  const { data: workout } = useWorkoutQuery(workoutId);
  const { data: catalog = [] } = useExercisesQuery();

  const selectedExercises = useMemo<Record<string, string[]>>(() => {
    if (!workout) return {};
    const workoutIds = new Set(workout.exercises.map(e => e.exercise_id));
    const inWorkout = catalog.filter(ex => workoutIds.has(ex.id));
    const result: Record<string, string[]> = {};
    for (const groupId of [...PRIMARY_MUSCLE_GROUPS, 'myself']) {
      const ids = filterExercisesByCategory(inWorkout, groupId, user?.id ?? null).map(ex => ex.id);
      if (ids.length > 0) result[groupId] = ids;
    }
    return result;
  }, [workout, catalog, user]);

  const exerciseSets = useMemo<Record<string, ExerciseSet[]>>(() => {
    if (!workout) return {};
    const result: Record<string, ExerciseSet[]> = {};
    for (const item of workout.exercises) {
      if (item.target_sets.length === 0) continue;
      result[item.exercise_id] = item.target_sets.map(s => ({
        weight: Number(s.target_weight_kg ?? 0),
        reps: s.target_reps ?? 0,
      }));
    }
    return result;
  }, [workout]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(`/session/${workoutId}`)} />
        <h1 className={styles.title}>Добавить упражнение</h1>
      </div>

      <ExercisesTabs
        sessionMode
        sessionWorkoutId={workoutId}
        selectedExercises={selectedExercises}
        exerciseSets={exerciseSets}
      />
    </div>
  );
};

export default SessionAddExercisesPage;