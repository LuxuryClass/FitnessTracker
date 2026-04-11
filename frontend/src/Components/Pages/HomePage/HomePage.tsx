import { Header } from './components/Header/header';
import { TodayWorkout } from './components/TodayWorkout/TodayWorkautCard';
import styles from './Styles.module.scss';

let name = "Иван";
let avatar = "src"

function HomePage() {
  return (
    <main className={styles.page}>
      <Header className={styles.header} userName={name} userAvatar={avatar}/>
      <TodayWorkout></TodayWorkout>
    </main>
  );
}

export default HomePage;
