import styles from './Styles.module.scss';
import { memo } from 'react';

interface RecentCardProps {
    title: string;
    muscleGroup: string;
    difference: string;
}


const card = ({title, muscleGroup, difference}: RecentCardProps) => {
    return (
        <div className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.muscle_group}>{muscleGroup}</p>
            <span className={styles.difference}>{difference}</span>
            <span className={styles.days_count}>за последние 30 дней</span>
        </div>
    )
}

export const RecentCard = memo(card);