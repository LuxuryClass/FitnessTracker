import { useNavigate } from 'react-router-dom';
import styles from './TopBar.module.scss';

/**
 * Fixed CTA bar pinned to the very top of the card. Always reachable, never
 * scrolls away. Lives outside the scroller (like the progress rail).
 */
export function TopBar() {
  const navigate = useNavigate();
  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.login}
        onClick={() => navigate('/login')}
      >
        Войти
      </button>
      <button
        type="button"
        className={styles.start}
        onClick={() => navigate('/register')}
      >
        Начать
        <span className={styles.arrow}>→</span>
      </button>
    </div>
  );
}
