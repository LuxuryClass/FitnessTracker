import { Header } from './components/Header/header';
import { CardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from './components/StatsCards/StatsCards';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';
import { useAuth } from '@/Auth';
import defaultAvatar from '/masscot-main.png';

let graphicsArr: CardData[] = [
  {id: 1, title: "Жим лёжа", muscleGroup: "Грудь", difference: "+5кг"},
  {id: 2, title: "Присядания", muscleGroup: "Ноги", difference: "+50кг"},
  {id: 3, title: "жим над головой", muscleGroup: "Дельты", difference: "+3кг"},
]

const plannedDates = [
  new Date(2026, 3, 21),
  new Date(2026, 3, 23), 
  new Date(2026, 3, 25),
];

const completedDates = [
  new Date(2026, 3, 20),
];

const HomePage = () => {
  const { user } = useAuth();
  const userName = user?.username ?? "Пользователь";
  const userAvatar = user?.avatar_url ?? defaultAvatar;
  const streakWeeks = user?.streak_weeks ?? 0;
  const weeklyVolumeTons = Number(user?.weekly_volume_tons ?? 0) || 0;
  const weeklyCompletedSessions = user?.weekly_sessions_progress?.completed ?? 0;
  const weeklyTotalSessions = user?.weekly_sessions_progress?.total ?? 0;

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

      <RecentCardsList className={styles.recent_list} cards={graphicsArr} />

    </main>
  );
}

export default HomePage;
