import { memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface MuscleGroupBadgeProps {
  groups: string[];
  primaryGroups?: string[];
  className?: string;
}

const MuscleGroupBadgeComponent = ({ groups, primaryGroups = [], className }: MuscleGroupBadgeProps) => {
  if (!groups || groups.length === 0) return null;

  const uniqueGroups = [...new Set(groups)];
  const primarySet = new Set(primaryGroups);

  return (
    <div className={cn(styles.badge, className)}>
      {uniqueGroups.map((group, index) => (
        <span key={index} className={styles.group}>
          <span className={cn(primarySet.has(group) && styles.groupPrimary)}>{group}</span>
          {index < uniqueGroups.length - 1 && <span className={styles.separator}>•</span>}
        </span>
      ))}
    </div>
  );
};

export const MuscleGroupBadge = memo(MuscleGroupBadgeComponent);