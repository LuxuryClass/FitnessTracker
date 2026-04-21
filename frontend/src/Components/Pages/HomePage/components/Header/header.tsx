import { memo } from "react";
import styles from "./Styles.module.scss";
import { Button } from "@/Components/UI/Button/Button";
import activBell from "/Bell_Active.svg";
import basicBell from "/Bell.svg";
import cn from "classnames";

interface HeaderProps {
  userName: string;
  userAvatar?: string;
  isActivBell?: boolean;
  className?: string;
}

const HeaderComponent = ({ userName, userAvatar, isActivBell, className }: HeaderProps) => {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  return (
    <div className={cn(styles.header, className)}>
      <div>
        <p className={styles.greeting}>{greeting()},</p>
        <h1 className={styles.userName}>{userName}</h1>
      </div>
      <div className={styles.buttons}>
        <Button color="accent-2" className={styles.avatar_button}>
          <img className={styles.userAvatar} src={userAvatar} alt="avatar" /> 
        </Button>
        <Button color="accent-2" className={styles.bell_button}>
          <img className={styles.bell} src={isActivBell ? activBell : basicBell}/>
        </Button>
      </div>
    </div>
  );
};

export const Header = memo(HeaderComponent);
