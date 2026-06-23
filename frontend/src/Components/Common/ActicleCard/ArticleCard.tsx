import { memo, } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ArticleCardProps {
  title: string;
  description?: string | null;
  readingTimeMinutes: number;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onClick?: () => void;
  className?: string;
}

const ArticleCardComponent = ({
  title,
  description,
  readingTimeMinutes,
  isFavorite = false,
  onFavorite,
  onClick,
  className,
}: ArticleCardProps) => {
  return (
    <div className={cn(styles.card, className)} onClick={onClick}>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
        <span className={styles.meta}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={styles.clockIcon}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {readingTimeMinutes} мин чтения
        </span>
      </div>

      <div className={styles.rightCol}>
        <button
          className={cn(styles.likeBtn, isFavorite && styles.likeBtn_active)}
          onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
          aria-label="В избранное"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button
          className={styles.arrow}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          aria-label="Читать"
        >
          <span className={styles.arrowIcon}>›</span>
        </button>
      </div>
    </div>
  );
};

export const ArticleCard = memo(ArticleCardComponent);