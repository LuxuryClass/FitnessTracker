import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import { MuscleGroupCard } from '@/Components/Common/MuscleGroupCard/MuscleGroupCard';
import searchIcon from "/icons/Search.svg";

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  exercisesCount: number;
}

interface ExercisesTabsProps {
  selectedExercises: Record<string, string[]>;
  onExercisesChange: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
}

const ExercisesTabs = ({ selectedExercises, /*onExercisesChange*/ }: ExercisesTabsProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const [muscleGroups] = useState<MuscleGroup[]>([
    { id: 'chest', name: 'Грудь', icon: '/icons/chest.svg', exercisesCount: 12 },
    { id: 'back', name: 'Спина', icon: '/icons/back.svg', exercisesCount: 15 },
    { id: 'legs', name: 'Ноги', icon: '/icons/legs.svg', exercisesCount: 20 },
    { id: 'shoulders', name: 'Плечи', icon: '/icons/shoulders.svg', exercisesCount: 10 },
    { id: 'arms', name: 'Руки', icon: '/icons/arms.svg', exercisesCount: 14 },
    { id: 'abs', name: 'Пресс', icon: '/icons/abs.svg', exercisesCount: 14 },
    { id: 'cardio', name: 'Кардио', icon: '/icons/cardio.svg', exercisesCount: 6 },
    { id: 'another', name: 'Другое', icon: '/icons/another.svg', exercisesCount: 6 },
    { id: 'myself', name: 'Личные', icon: '/icons/personal.svg', exercisesCount: 6 },
  ]);

  const filteredGroups = muscleGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSelectedCount = (groupId: string) => {
    return selectedExercises[groupId]?.length || 0;
  };

  const handleCardClick = (group: MuscleGroup) => {
    navigate(`/exercises/${group.id}`, {
      state: {
        muscleGroup: group,
        currentSelectedExercises: selectedExercises,
      }
    });
  };

  const handleAddExercise = () => {
    console.log('Добавить своё упражнение');
  };

  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <div className={styles.searchWrapper}>
          <Input
            type="text"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск"
            className={styles.searchInput}
          />
          <img src={searchIcon} alt="поиск" className={styles.searchIcon} />
        </div>
        <Button 
          size="s" 
          color="primary" 
          onClick={handleAddExercise}
          className={styles.addButton}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Создать упражнение
        </Button>
      </div>

      <div className={styles.grid}>
        {filteredGroups.map(group => (
          <MuscleGroupCard
            key={group.id}
            name={group.name}
            icon={group.icon}
            exercisesCount={group.exercisesCount}
            selectedCount={getSelectedCount(group.id)}
            onClick={() => handleCardClick(group)}
          />
        ))}
      </div>
    </div>
  );
};

export default ExercisesTabs;