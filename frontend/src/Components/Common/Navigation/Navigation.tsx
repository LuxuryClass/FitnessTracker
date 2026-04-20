import { Link, useLocation } from "react-router-dom";
import styles from "./styles.module.scss";
import { memo } from "react";

// Импортируем иконки
import homeIcon from "/Public/NavigationImage/Home.svg";
import bookIcon from "/Public/NavigationImage/Book.svg";
import dumbbellIcon from "/Public/NavigationImage/Plus.svg";
import chartIcon from "/Public/NavigationImage/Graphic.svg";
import settingsIcon from "/Public/NavigationImage/Settings.svg";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: "/home", label: "Главная", icon: homeIcon },
  { path: "/almanah", label: "Справочник", icon: bookIcon },
  { path: "/add", label: "Тренировка", icon: dumbbellIcon },
  { path: "/progress", label: "Прогресс", icon: chartIcon },
  { path: "/settings", label: "Настройки", icon: settingsIcon },
];

const NavigationComponent = () => {
  const location = useLocation();

  return (
    <div className={styles.navigation}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
                        location.pathname.startsWith(item.path + "/");
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.link} ${isActive ? styles.link_active : ""}`}
          >
            <img 
              src={item.icon} 
              alt={item.label}
              className={styles.icon}
            />
            <span className={`${styles.text} ${isActive ? styles.text_active : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export const NavigationPanel = memo(NavigationComponent);