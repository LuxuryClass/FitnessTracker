import { Link, useLocation } from "react-router-dom";
import styles from "./Styles.module.scss";
import { memo } from "react";

import homeIcon from "/NavigationImage/Home.svg";
import bookIcon from "/NavigationImage/Book.svg";
import plusIcon from "/NavigationImage/Plus.svg";
import chartIcon from "/NavigationImage/Graphic.svg";
import settingsIcon from "/NavigationImage/Settings.svg";

const NavigationComponent = () => {
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className={styles.navigation}>
      
      {/* Главная */}
      <Link to="/home" className={`${styles.link} ${isActive("/home") ? styles.link_active : ""}`}>
        <div className={styles.icon} style={{ '--icon-url': `url("${homeIcon}")` } as React.CSSProperties} />
        <span className={styles.text}>Главная</span>
      </Link>

      {/* Справочник */}
      <Link to="/almanah" className={`${styles.link} ${isActive("/almanah") ? styles.link_active : ""}`}>
        <div className={styles.icon} style={{ '--icon-url': `url("${bookIcon}")` } as React.CSSProperties} />
        <span className={styles.text}>Справочник</span>
      </Link>

      {/* Тренировка (специальная кнопка) */}
      <Link to="/add" className={`${styles.link_special} ${isActive("/add") ? styles.link_special_active : ""}`}>
        <div className={styles.wrapper}>
            <div className={styles.icon_special} style={{ '--icon-url': `url("${plusIcon}")` } as React.CSSProperties} />
        </div>
        <span className={styles.text_special}>Тренировка</span>
      </Link>

      {/* Прогресс */}
      <Link to="/progress" className={`${styles.link} ${isActive("/progress") ? styles.link_active : ""}`}>
        <div className={styles.icon} style={{ '--icon-url': `url("${chartIcon}")` } as React.CSSProperties} />
        <span className={styles.text}>Прогресс</span>
      </Link>

      {/* Настройки */}
      <Link to="/settings" className={`${styles.link} ${isActive("/settings") ? styles.link_active : ""}`}>
        <div className={styles.icon} style={{ '--icon-url': `url("${settingsIcon}")` } as React.CSSProperties} />
        <span className={styles.text}>Настройки</span>
      </Link>

    </div>
  );
};

export const NavigationPanel = memo(NavigationComponent);
