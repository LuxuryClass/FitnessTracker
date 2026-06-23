import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import ExercisesTabs from '@/Components/Pages/AddPa/components/ExercisesTabs/ExercisesTabs';
import styles from './Styles.module.scss';

const GuideExercisesPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate('/almanah')} />
        <h1 className={styles.title}>Упражнения</h1>
      </div>

      <ExercisesTabs browseMode />
    </div>
  );
};

export default GuideExercisesPage;