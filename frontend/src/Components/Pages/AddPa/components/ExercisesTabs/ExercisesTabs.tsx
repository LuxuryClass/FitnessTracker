import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { Input } from '@/Components/UI/Input/Input';
import styles from './Styles.module.scss';
import { MuscleGroupCard } from '@/Components/Common/MuscleGroupCard/MuscleGroupCard';
import searchIcon from "/icons/Search.svg";
import { useAuth } from '@/Auth';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { filterExercisesByCategory } from '../../muscleGroupMapping';

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
}

interface ExercisesTabsProps {
  selectedExercises: Record<string, string[]>;
  onExercisesChange: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
}

const ExercisesTabs = ({ selectedExercises, /*onExercisesChange*/ }: ExercisesTabsProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { data: exercises = [] } = useExercisesQuery();

  const muscleGroups: MuscleGroup[] = [
    { id: 'chest', name: 'Грудь', icon: '/icons/chest.svg' },
    { id: 'back', name: 'Спина', icon: '/icons/back.svg' },
    { id: 'legs', name: 'Ноги', icon: '/icons/legs.svg' },
    { id: 'shoulders', name: 'Плечи', icon: '/icons/shoulders.svg' },
    { id: 'arms', name: 'Руки', icon: '/icons/arms.svg' },
    { id: 'core', name: 'Корпус', icon: '/icons/abs.svg' },
    { id: 'cardio', name: 'Кардио', icon: '/icons/cardio.svg' },
    { id: 'myself', name: 'Личные', icon: '/icons/personal.svg' },
  ];

  const filteredGroups = muscleGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExercisesCount = (groupId: string) =>
    filterExercisesByCategory(exercises, groupId, user?.id ?? null).length;

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
    // TODO: реализовать создание упражнения через POST /exercises (отдельная итерация).
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
            exercisesCount={getExercisesCount(group.id)}
            selectedCount={getSelectedCount(group.id)}
            onClick={() => handleCardClick(group)}
          />
        ))}
      </div>
    </div>
  );
};

export default ExercisesTabs;