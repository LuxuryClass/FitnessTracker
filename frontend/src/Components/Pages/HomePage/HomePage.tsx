import { Header } from './components/Header/header';
import { RecentCardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from '../../Common/StatCard/StatCard';
import { TodayWorkout, type TodayWorkoutExercise } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';
import { useAuth } from '@/Auth';
import { RecentProgressItem, type NextWorkoutExerciseItem } from '@/Auth/authApi';
import defaultAvatar from '/masscot-main.png';
import { useCallback, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';
import { useScheduleQuery } from '@/hooks/useScheduleQuery';
import { useRecentProgressQuery } from '@/hooks/useRecentProgressQuery';
import { useNextWorkoutQuery } from '@/hooks/useNextWorkoutQuery';

const formatDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getInitialWeekRange = () => {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { from: formatDate(weekStart), to: formatDate(weekEnd) };
};

const HomePage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [weekRange, setWeekRange] = useState(getInitialWeekRange);

  const { data: scheduleData = [] } = useScheduleQuery(weekRange.from, weekRange.to);
  const { data: recentProgressData = [] } = useRecentProgressQuery();
  const { data: nextWorkout, isPending: isNextWorkoutPending } = useNextWorkoutQuery();

  const userName = user?.name ?? "Пользователь";
  const userAvatar = user?.avatar_url ?? defaultAvatar;
  const streakWeeks = user?.streak_weeks ?? 0;
  const weeklyVolumeTons = Number(user?.weekly_volume_tons ?? 0) || 0;
  const weeklyCompletedSessions = user?.weekly_sessions_progress?.completed ?? 0;
  const weeklyTotalSessions = user?.weekly_sessions_progress?.total ?? 0;

  const recentProgress: RecentCardData[] = recentProgressData.map((item: RecentProgressItem) => {
    const differenceNum = Number(item.difference_kg);
    const sign = differenceNum >= 0 ? '+' : '';
    return {
      id: item.exercise_id,
      title: item.exercise_name,
      muscleGroup: item.muscle_group,
      difference: `${sign}${differenceNum}кг`,
    };
  });

  const handleWeekChange = useCallback((weekStart: Date, weekEnd: Date) => {
    setWeekRange({ from: formatDate(weekStart), to: formatDate(weekEnd) });
  }, []);

  const plannedDates = scheduleData
    .filter(w => w.status === 'planned')
    .map(w => new Date(w.date));

  const completedDates = scheduleData
    .filter(w => w.status === 'completed')
    .map(w => new Date(w.date));

  const todayStr = formatDate(new Date());

  const upcomingWorkouts = scheduleData
    .filter(w => w.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 5);

  return (
    <main className={styles.page}>

      {/* Блок "Шапка" */}
      <Header className={styles.header} userName={userName} userAvatar={userAvatar}/>

      {/* Блок "Ближайшая тренировка" */}
      {!isAuthLoading && !isNextWorkoutPending && (
        nextWorkout ? (
          <TodayWorkout
            title={nextWorkout.title}
            plannedFor={nextWorkout.planned_for}
            durationMinutes={nextWorkout.estimated_duration_minutes}
            exercisesCount={nextWorkout.exercises_count}
            muscleGroups={nextWorkout.muscle_groups}
            exercises={nextWorkout.exercises.map((item: NextWorkoutExerciseItem): TodayWorkoutExercise => ({
              name: item.name,
              // На карточке показываем первую группу мышц упражнения — этого достаточно для краткой пометки.
              muscleGroup: item.muscle_groups[0] ?? '',
              setsCount: item.sets_count,
              targetRepsMin: item.target_reps_min,
              targetRepsMax: item.target_reps_max,
              targetWeightKgMin: item.target_weight_kg_min !== null ? Number(item.target_weight_kg_min) : null,
              targetWeightKgMax: item.target_weight_kg_max !== null ? Number(item.target_weight_kg_max) : null,
            }))}
          />
        ) : (
          <TodayWorkout isEmpty />
        )
      )}

      {/* Блок "Миникарточки статистики" */}
      <div className={styles.minicards}>
        <StatCard isVisible={true} type="streak" value={streakWeeks}></StatCard>
        <StatCard isVisible={true} type="week" value={weeklyCompletedSessions} total={weeklyTotalSessions}></StatCard>
        <StatCard isVisible={true} type="totalWeight" value={weeklyVolumeTons}></StatCard>
      </div>

      {/* Блок "Расписание" */}
      <WeekCalendarSection
        plannedDates={plannedDates}
        completedDates={completedDates}
        onWeekChange={handleWeekChange}
      />

      {/* Блок "Недавний прогресс" */}
      {recentProgress.length > 0 && (
        <RecentCardsList className={styles.recent_list} cards={recentProgress} />
      )}

      {/* Блок "Акцент на мышщы на этой неделе" */}
      <div className={styles.accentSection}>
        <h3 className={styles.accentSection_title}>Акцент на мышцы на этой неделе</h3>
        <MuscleAccentComponent className={styles.accentSection_component}/>
      </div>

      {/* Блок "Далее" */}
      {upcomingWorkouts.length > 0 && (
        <div className={styles.nextSection}>
          <h3 className={styles.accentSection_title}>Далее</h3>
          <div className={styles.upcomingList}>
            {upcomingWorkouts.map(workout => (
              <WorkoutCard
                key={workout.id}
                title={workout.title}
                date={new Date(workout.date)}
                time={workout.time ?? undefined}
                exercisesCount={workout.exercises_count}
                muscleGroups={workout.muscle_groups}
              />
            ))}
          </div>
        </div>
      )}

    </main>
  );
}

export default HomePage;
