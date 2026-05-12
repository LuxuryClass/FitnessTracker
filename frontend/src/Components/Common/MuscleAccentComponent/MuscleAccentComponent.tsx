import classNames from "classnames";
import styles from "./Styles.module.scss";

interface MuscleAccentProps {
    className?: string;

}

const MuscleAccentComponent = ({className}: MuscleAccentProps) => {
    return (
        <div className={classNames(styles.component, className)}>
            
        </div>
    )
}

export default MuscleAccentComponent;