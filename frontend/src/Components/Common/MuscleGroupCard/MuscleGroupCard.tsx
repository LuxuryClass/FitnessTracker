import { memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface MuscleGroupCardProps {
  name: string;
  icon?: string;
  exercisesCount: number;
  selectedCount?: number;
  onClick?: () => void;
  className?: string;
}

const MuscleGroupCardComponent = ({
  name,
  icon,
  exercisesCount,
  selectedCount = 0,
  onClick,
  className,
}: MuscleGroupCardProps) => {
  return (
    <div
      className={cn(styles.card, selectedCount > 0 && styles.card_selected, className)}
      onClick={onClick}
    >
      {selectedCount > 0 && (
        <span className={styles.badge}>{selectedCount}</span>
      )}
      {icon && <img src={icon} alt={name} className={styles.icon} />}
      <span className={styles.name}>{name}</span>
      <span className={styles.count}>{exercisesCount} exercises</span>
    </div>
  );
};

export const MuscleGroupCard = memo(MuscleGroupCardComponent);