import cn from "classnames";
import styles from "./Styles.module.scss";
import { memo, useEffect, useState } from "react";

type StatCardType = 'streak' | 'week' | 'totalWeight';

interface StatCardProps {
    isVisible: boolean;
  type: StatCardType;
  value: number;
  total?: number;
  className?: string;
}

const config = {
  streak: {
    label: 'Недель подряд',
    formatValue: (value: number) => value,
  },
  week: {
    label: 'На этой неделе',
    formatValue: (value: number, total?: number) => `${value}/${total}`,
  },
  totalWeight: {
    label: 'Общий объем',
    formatValue: (value: number) => `${value} Т`,
  },
};

const StatCardComponent = ({ isVisible, type, value, total, className }: StatCardProps) => {
  if (!isVisible)
    return;
  
  const { label, formatValue } = config[type];
  const weekTotal = total ?? 0;
  const displayValue = type === 'week' ? formatValue(value, weekTotal) : formatValue(value);
  const [animatedOffset, setAnimatedOffset] = useState<number | null>(null);

  useEffect(() => {
    if (type === 'week') {
      const timer = setTimeout(() => {
        const percentage = weekTotal > 0 ? (value / weekTotal) * 100 : 0;
        const normalizedPercentage = Math.max(0, Math.min(percentage, 100));
        const radius = 31;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (normalizedPercentage / 100) * circumference;
        setAnimatedOffset(offset);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [type, value, weekTotal]);

  if (type === 'week') {
    const radius = 31;
    const circumference = 2 * Math.PI * radius;
    const currentOffset = animatedOffset !== null ? animatedOffset : circumference;
    
    return (
      <div className={cn(styles.card, className)}>
        <div className={styles.progressWrapper}>
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle
              cx="35"
              cy="35"
              r={radius}
              fill="none"
              stroke="#4B4E44"
              strokeWidth="4"
            />
            <circle
              cx="35"
              cy="35"
              r={radius}
              fill="none"
              stroke="var(--Primary-color, #9FDA16)"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={currentOffset}
              strokeLinecap="round"
              transform="rotate(-90 35 35)"
              className={styles.progressFill}
            />
          </svg>
          <span>
            {displayValue}
          </span>
        </div>
        <span className={styles.label}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(styles.card, className)}>
      <span className={cn(styles.value, styles[`value__${type}`])}>
        {displayValue}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
};

export const StatCard = memo(StatCardComponent);
