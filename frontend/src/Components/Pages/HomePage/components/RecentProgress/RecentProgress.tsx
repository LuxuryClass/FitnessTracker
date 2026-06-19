import styles from './Styles.module.scss';
import { memo } from 'react';
import { RecentCard } from '../../../../Common/RecentProgressCard/RecentProgressCard';
import classNames from 'classnames';

export interface RecentCardData {
    id: string | number;
    title: string;
    muscleGroup?: string;
    difference: string;
}

interface RecentCardsListProps {
    cards: RecentCardData[];
    className?: string;
}

const RecentCardsComponent = ({ cards, className }: RecentCardsListProps) => {
  return (
    <div className={classNames(styles.container, className)}>
      <div className={styles.header}>
        <span className={styles.title}>Недавний прогресс</span>
        {/* <Link to="/graphics" className={styles.link}>Смотреть все</Link> */}
      </div>

      <div className={classNames(styles.cards_list, styles.hide_scrollbar)}>
        {cards.map((card) => (
          <RecentCard
            key={card.id}
            title={card.title}
            muscleGroup={card.muscleGroup}
            difference={card.difference}
          />
        ))}
      </div>
    </div>
  );
};

export const RecentCardsList = memo(RecentCardsComponent);