import styles from './Styles.module.scss';
import { memo } from 'react';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';

interface RecentCardProps {
  title: string;
  muscleGroup?: string;
  difference: string;
  daysCount?: number;
}

const RecentCardComponent = ({
  title,
  muscleGroup,
  difference,
  daysCount = 7,
}: RecentCardProps) => {
  // Разбиваем строку в массив для MuscleGroupBadge; без группы пилюля не рендерится
  const groups = muscleGroup ? muscleGroup.split(',').map(g => g.trim()) : [];

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <MuscleGroupBadge groups={groups} type='block'/>
      <span className={styles.difference}>{difference}</span>
      <span className={styles.days_count}>{daysCount} дней</span>
    </div>
  );
};

export const RecentCard = memo(RecentCardComponent);