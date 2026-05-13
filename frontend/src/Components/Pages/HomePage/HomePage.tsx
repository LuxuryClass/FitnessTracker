import { Header } from './components/Header/header';
import { RecentCardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from '../../Common/StatCard/StatCard';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';
import { useAuth } from '@/Auth';
import { authApi, RecentProgressItem } from '@/Auth/authApi';
import defaultAvatar from '/masscot-main.png';
import { useEffect, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import { WorkoutCard } from '@/Components/Common/WorkoutCard/WorkoutCard';

const plannedDates = [
  new Date(2026, 3, 21),
  new Date(2026, 3, 23),
  new Date(2026, 3, 25),
];

const completedDates = [
  new Date(2026, 3, 20),
];

// Тестовые тренировки для блока "Далее"
const upcomingWorkouts = [
  {
    id: '1',
    title: 'День ног',
    time: 'Завтра, 9:00',
    exercisesCount: 5,
    muscleGroups: ['Ноги', 'Ягодицы'],
    date: new Date(),
  },
  {
    id: '2',
    title: 'День спины',
    time: '14 мая, 17:00',
    exercisesCount: 4,
    muscleGroups: ['Спина', 'Бицепс'],
    date: new Date(),
  },
  {
    id: '3',
    title: 'Кардио',
    time: '16 мая, 8:30',
    exercisesCount: 3,
    muscleGroups: ['Кардио'],
    date: new Date(),
  },
];

const HomePage = () => {
  const { user, tokens } = useAuth();
  const [recentProgress, setRecentProgress] = useState<RecentCardData[]>([]);

  const userName = user?.name ?? "Пользователь";
  const userAvatar = user?.avatar_url ?? defaultAvatar;
  const streakWeeks = user?.streak_weeks ?? 0;
  const weeklyVolumeTons = Number(user?.weekly_volume_tons ?? 0) || 0;
  const weeklyCompletedSessions = user?.weekly_sessions_progress?.completed ?? 0;
  const weeklyTotalSessions = user?.weekly_sessions_progress?.total ?? 0;

  useEffect(() => {
    const fetchRecentProgress = async () => {
      if (!tokens?.accessToken) {
        return;
      }

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
      <WeekCalendarSection plannedDates={plannedDates} completedDates={completedDates}/>
        
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
      <div className={styles.nextSection}>
        <h3 className={styles.accentSection_title}>Далее</h3>
        <div className={styles.upcomingList}>
          {upcomingWorkouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              title={workout.title}
              time={workout.time}
              exercisesCount={workout.exercisesCount}
              muscleGroups={workout.muscleGroups}
              onClick={() => console.log('Открыть тренировку', workout.id)}
            />
          ))}
        </div>
      </div>

    </main>
  );
}

export default HomePage;
