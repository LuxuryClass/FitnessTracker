import { memo, useRef, useEffect, useState } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface MuscleGroupBadgeProps {
  groups: string[];
  primaryGroups?: string[];
  type?: 'block' | 'inline' | 'filter';
  className?: string;
  onToggle?: (group: string) => void;
}

const MuscleGroupBadgeComponent = ({ 
  groups, 
  primaryGroups = [], 
  type = 'inline',
  className,
  onToggle,
}: MuscleGroupBadgeProps) => {
  const chipsRef = useRef<HTMLDivElement>(null);
  const [maskStyle, setMaskStyle] = useState<string>('none');

  if (!groups || groups.length === 0) return null;

  const uniqueGroups = [...new Set(groups)];
  const primarySet = new Set(primaryGroups);

  useEffect(() => {
    const el = chipsRef.current;
    if ((type !== 'block' && type !== 'filter') || !el) return;

    const updateMask = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      if (!hasOverflow) {
        setMaskStyle('none');
        return;
      }

      const scrolledToEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      const atStart = el.scrollLeft <= 0;

      if (atStart) {
        setMaskStyle('linear-gradient(to right, black calc(100% - 20px), transparent 100%)');
      } else if (scrolledToEnd) {
        setMaskStyle('linear-gradient(to right, transparent 0%, black 20px)');
      } else {
        setMaskStyle('linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)');
      }
    };

    updateMask();
    el.addEventListener('scroll', updateMask);
    window.addEventListener('resize', updateMask);
    return () => {
      el.removeEventListener('scroll', updateMask);
      window.removeEventListener('resize', updateMask);
    };
  }, [groups, type]);

  if (type === 'inline') {
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
  }

  if (type === 'filter') {
    return (
      <div 
        ref={chipsRef}
        className={cn(styles.filters, className)}
        style={{
          maskImage: maskStyle,
          WebkitMaskImage: maskStyle,
        }}
      >
        {uniqueGroups.map((group) => (
          <button
            key={group}
            className={cn(styles.filterChip, primarySet.has(group) && styles.filterChipActive)}
            onClick={() => onToggle?.(group)}
          >
            {group}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={chipsRef}
      className={cn(styles.chips, className)}
      style={{
        maskImage: maskStyle,
        WebkitMaskImage: maskStyle,
      }}
    >
      {uniqueGroups.map((group, index) => (
        <span 
          key={index} 
          className={cn(styles.chip, primarySet.has(group) && styles.chipPrimary)}
        >
          {group}
        </span>
      ))}
    </div>
  );
};

export const MuscleGroupBadge = memo(MuscleGroupBadgeComponent);