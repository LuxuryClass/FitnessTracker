import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Styles.module.scss";
import logoImage from "/masscot-main.png";
import classNames from "classnames";

const StartPage = () => {
  const navigate = useNavigate();
  const [animationState, setAnimationState] = useState<'entering' | 'leaving'>('entering');

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setAnimationState('leaving');

      const navigateTimer = setTimeout(() => {
        navigate("/enter");
      }, 800);
      
      return () => clearTimeout(navigateTimer);
    }, 2000);

    return () => clearTimeout(showTimer);
  }, [navigate]); 

  return (
    <div className={classNames(styles.start_page, styles[animationState])}>
      <img className={styles.logo} src={logoImage} alt="Fitness Tracker Logo" />
      <h1 className={styles.title}>Fitness Tracker</h1>
    </div>
  );
};

export default StartPage;
