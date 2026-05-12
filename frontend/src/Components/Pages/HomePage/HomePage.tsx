import { Header } from './components/Header/header';
import { CardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from '../../Common/StatCard/StatCard';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';
import { useAuth } from '@/Auth';
import { authApi, RecentProgressItem } from '@/Auth/authApi';
import defaultAvatar from '/masscot-main.png';
import { useEffect, useState } from 'react';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';

const plannedDates = [
  new Date(2026, 3, 21),
  new Date(2026, 3, 23),
  new Date(2026, 3, 25),
];

const completedDates = [
  new Date(2026, 3, 20),
];

const HomePage = () => {
  const { user, tokens } = useAuth();
  const [recentProgress, setRecentProgress] = useState<CardData[]>([]);

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
        const mappedData: CardData[] = data.map((item: RecentProgressItem) => {
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
      <Header className={styles.header} userName={userName} userAvatar={userAvatar}/>

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

      <div className={styles.minicards}>
        <StatCard isVisible={true} type="streak" value={streakWeeks}></StatCard>
        <StatCard isVisible={true} type="week" value={weeklyCompletedSessions} total={weeklyTotalSessions}></StatCard>
        <StatCard isVisible={true} type="totalWeight" value={weeklyVolumeTons}></StatCard>
      </div>

      <WeekCalendarSection plannedDates={plannedDates} completedDates={completedDates}/>

      {recentProgress.length > 0 && (
        <RecentCardsList className={styles.recent_list} cards={recentProgress} />
      )}

      <div className={styles.accentSection}>
        <h2 className={styles.accentSection_title}>Акцент на мышцы на этой неделе</h2>
        <MuscleAccentComponent className={styles.accentSection_component}/>
      </div>

      
    </main>
  );
}

export default HomePage;
