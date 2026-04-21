import { Link } from "react-router-dom";
import styles from "./Styles.module.scss";
import { Button } from "@/Components/UI/Button/Button";
import { memo } from "react";
import logoImage from "/masscot-main.png";

const EnterPageComponent = () => {
    return (
        <div className={styles.enter_page}>
            <img className={styles.logo} src={logoImage} alt="logo"/>
            <h1 className={styles.title}>Давайте начнем!</h1>
            <p className={styles.subtitle}>Войдите или зарегистрируйтесь, чтобы получить доступ к тренировкам</p>
            
            <div className={styles.buttons}>
                <Link to="/login">
                    <Button
                        size="l" color="primary" type="button" fullWidth={true}
                    >Войти</Button>
                </Link>   
                <Link to="/register">
                    <Button
                        size="l" color="accent" type="button" fullWidth={true}
                    >Зарегистрироваться</Button>
                </Link>
            </div>

        </div>
    )
}

export const EnterPage = memo(EnterPageComponent);
