import { Header } from './components/Header/header';
import { CardData, RecentCardsList } from './components/RecentProgress/RecentProgress';
import { StatCard } from './components/StatsCards/StatsCards';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';
import { WeekCalendarSection } from './components/WeekCalendarSection/WeekCalendarSection';

let name = "Иван";
let avatar = "src"

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
  return (
    <main className={styles.page}>
      <Header className={styles.header} userName={name} userAvatar={avatar}/>
      
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
        <StatCard isVisible={true} type="streak" value={8}></StatCard>
        <StatCard isVisible={true} type="week" value={2} total={3}></StatCard>
        <StatCard isVisible={true} type="totalWeight" value={8.5}></StatCard>
      </div>
      
      <WeekCalendarSection plannedDates={plannedDates} completedDates={completedDates}/>

      <RecentCardsList className={styles.recent_list} cards={graphicsArr} />

    </main>
  );
}

export default HomePage;
