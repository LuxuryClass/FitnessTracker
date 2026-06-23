import { memo, useState } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';
import type { ExerciseSet } from '@/Auth/authApi';

interface SessionResultRowProps {
  name: string;
  muscleGroup?: string;
  sets: ExerciseSet[];
  imageUrl?: string;
  onImageClick?: () => void;
  defaultExpanded?: boolean;
}

const SessionResultRowComponent = ({
  name,
  muscleGroup,
  sets,
  imageUrl,
  onImageClick,
  defaultExpanded = true,
}: SessionResultRowProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(styles.card, expanded && styles.card_expanded)}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div
          className={styles.image}
          onClick={e => { e.stopPropagation(); onImageClick?.(); }}
        >
          {imageUrl && <img src={imageUrl} alt={name} />}
        </div>
        <div className={styles.headerInfo}>
          <span className={styles.name}>{name}</span>
          {muscleGroup && <span className={styles.muscle}>{muscleGroup}</span>}
        </div>
        <svg
          className={cn(styles.chevron, expanded && styles.chevron_open)}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {expanded && (
        <div className={styles.body}>
          {sets.length > 0 ? (
            sets.map((set, i) => (
              <div key={i} className={styles.setRow}>
                <span className={styles.setIndex}>{i + 1}</span>

                <div className={styles.valuesGroup}>
                  <div className={styles.weightGroup}>
                    <span className={styles.setValue}>{set.weight}</span>
                    <span className={styles.unit}>кг</span>
                  </div>

                  <span className={styles.multiply}>×</span>

                  <span className={styles.setValue}>{set.reps}</span>
                </div>
              </div>
            ))
          ) : (
            <span className={styles.empty}>Нет выполненных подходов</span>
          )}
        </div>
      )}
    </div>
  );
};

export const SessionResultRow = memo(SessionResultRowComponent);