import { Header } from './components/Header/header';
import { StatCard } from './components/StatsCards/StatsCards';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';

let name = "Иван";
let avatar = "src"

function HomePage() {
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

    </main>
  );
}

export default HomePage;
