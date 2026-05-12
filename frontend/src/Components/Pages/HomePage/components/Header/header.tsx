import { memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss";
import { Button } from "@/Components/UI/Button/Button";
import { useAuth } from "@/Auth";
import activBell from "/Bell_Active.svg";
import basicBell from "/Bell.svg";
import defaultAvatar from "/masscot-main.png";
import cn from "classnames";

interface HeaderProps {
  isActivBell?: boolean;
  className?: string;
}

const HeaderComponent = ({ isActivBell, className }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  const avatarSrc = /*user?.avatar || */ defaultAvatar;
  const userName = user?.username || "Пользователь";

  return (
    <div className={cn(styles.header, className)}>
      <div>
        <p className={styles.greeting}>{greeting()},</p>
        <h1 className={styles.userName}>{userName}</h1>
      </div>
      <div className={styles.buttons}>
        <Button color="accent-2" className={styles.avatar_button}>
          <img className={styles.userAvatar} src={userAvatar} alt="avatar" loading="eager" decoding="async" onClick={() => navigate('/settings')}/>
        </Button>
        <Button color="accent-2" className={styles.bell_button}>
          <img className={styles.bell} src={isActivBell ? activBell : basicBell} alt="уведомления"/>
        </Button>
      </div>
    </div>
  );
};

export const Header = memo(HeaderComponent);