import { memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface MuscleGroupBadgeProps {
  groups: string[];
  className?: string;
}

const MuscleGroupBadgeComponent = ({ groups, className }: MuscleGroupBadgeProps) => {
  if (!groups || groups.length === 0) return null;

  return (
    <div className={cn(styles.badge, className)}>
      {groups.map((group, index) => (
        <span key={index} className={styles.group}>
          {group}
          {index < groups.length - 1 && <span className={styles.separator}>•</span>}
        </span>
      ))}
    </div>
  );
};

export const MuscleGroupBadge = memo(MuscleGroupBadgeComponent);