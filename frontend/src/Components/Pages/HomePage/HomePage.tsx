import { Header } from './components/Header/header';
import { RecentCardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from '../../Common/StatCard/StatCard';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';
import { useAuth } from '@/Auth';
import { authApi, RecentProgressItem, ScheduleWorkoutItem } from '@/Auth/authApi';
import defaultAvatar from '/masscot-main.png';
import { useCallback, useEffect, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';

const formatDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const HomePage = () => {
  const { user, tokens } = useAuth();
  const [recentProgress, setRecentProgress] = useState<RecentCardData[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduleWorkoutItem[]>([]);

  const userName = user?.name ?? "Пользователь";
  const userAvatar = user?.avatar_url ?? defaultAvatar;
  const streakWeeks = user?.streak_weeks ?? 0;
  const weeklyVolumeTons = Number(user?.weekly_volume_tons ?? 0) || 0;
  const weeklyCompletedSessions = user?.weekly_sessions_progress?.completed ?? 0;
  const weeklyTotalSessions = user?.weekly_sessions_progress?.total ?? 0;

  useEffect(() => {
    const fetchRecentProgress = async () => {
      if (!tokens?.accessToken) return;
      try {
        const data = await authApi.getRecentProgress(tokens.accessToken);
        const mappedData: RecentCardData[] = data.map((item: RecentProgressItem) => {
          const differenceNum = Number(item.difference_kg);
          const sign = differenceNum >= 0 ? '+' : '';
          return {
            id: item.exercise_id,
            title: item.exercise_name,
            muscleGroup: item.muscle_group,
            difference: `${sign}${differenceNum}кг`,
          };
        });
        setRecentProgress(mappedData);
      } catch (error) {
        console.error('Не удалось загрузить недавний прогресс:', error);
        setRecentProgress([]);
      }
    };

    fetchRecentProgress();
  }, [tokens?.accessToken]);

  // Загружаем расписание для конкретной недели при листании
  const handleWeekChange = useCallback(async (weekStart: Date, weekEnd: Date) => {
    if (!tokens?.accessToken) return;
    try {
      const data = await authApi.getSchedule(tokens.accessToken, formatDate(weekStart), formatDate(weekEnd));
      // Мержим с уже загруженными данными, заменяя записи за этот диапазон
      setScheduledWorkouts(prev => {
        const fromStr = formatDate(weekStart);
        const toStr = formatDate(weekEnd);
        const filtered = prev.filter(w => w.date < fromStr || w.date > toStr);
        return [...filtered, ...data];
      });
    } catch (error) {
      console.error('Не удалось загрузить расписание:', error);
    }
  }, [tokens?.accessToken]);

  const plannedDates = scheduledWorkouts
    .filter(w => w.status === 'planned')
    .map(w => new Date(w.date));

  const completedDates = scheduledWorkouts
    .filter(w => w.status === 'completed')
    .map(w => new Date(w.date));

  const todayStr = formatDate(new Date());

  const upcomingWorkouts = scheduledWorkouts
    .filter(w => w.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 5);

  return (
    <main className={styles.page}>

      {/* Блок "Шапка" */}
      <Header className={styles.header} userName={userName} userAvatar={userAvatar}/>

      {/* Блок "Ближайшая тренеровка" */}
      <TodayWorkout  title = "День жимов"
        duration = "75 мин"
        exercisesCount = {6}
        muscleGroups = {["Грудь", "Плечи"]}
        exercises = {[
          { name: "Жим лежа", sets: 4, reps: 10, muscleGroup: "Грудь" },
          { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
          { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
          { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
          { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
          { name: "Жим гантелей", sets: 3, reps: 12, muscleGroup: "Грудь" },
        ]}
      />

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
