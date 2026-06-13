import { useMemo, useState } from "react";
import classNames from "classnames";
import Body, { type ExtendedBodyPart, type Slug } from "react-muscle-highlighter";
import { WeeklyMuscleFocusItem } from "@/Auth/authApi";
import styles from "./Styles.module.scss";

interface MuscleAccentProps {
    className?: string;
    gender: "male" | "female";
    data: WeeklyMuscleFocusItem[];
}

// Палитра ступеней интенсивности: индекс 0 - самый тусклый, последний - --Primary-color.
const INTENSITY_COLORS = [
    "#3c4a17",
    "#566a1f",
    "#6f8a1d",
    "#88ad17",
    "#9FDA16",
] as const;

const NEUTRAL_FILL = "#33352b";
const HEAD_FILL = "#4b4e44";
const HAIR_FILL = "#2c2e25";
const BORDER_COLOR = "#4B4E44";

// Относительная шкала от максимума: самый частый показатель всегда даёт ярчайший цвет.
const toBodyData = (data: WeeklyMuscleFocusItem[]): ExtendedBodyPart[] => {
    const N = INTENSITY_COLORS.length;
    const maxIntensity = data.reduce((max, item) => Math.max(max, item.intensity), 0);
    if (maxIntensity <= 0) return [];

    return data.map((item) => {
        const step = Math.ceil((item.intensity / maxIntensity) * N);
        return {
            slug: item.muscle as Slug,
            intensity: Math.min(Math.max(step, 1), N),
        };
    });
};

const MuscleAccentComponent = ({ className, gender, data }: MuscleAccentProps) => {
    const [side, setSide] = useState<"front" | "back">("front");

    // У библиотеки голова/волосы имеют захардкоженный цвет
    const bodyData = useMemo<ExtendedBodyPart[]>(
        () => [
            ...toBodyData(data),
            { slug: "head", color: HEAD_FILL },
            { slug: "hair", color: HAIR_FILL },
        ],
        [data],
    );

    const toggleSide = () => setSide((prev) => (prev === "front" ? "back" : "front"));

    const bodyProps = {
        data: bodyData,
        gender,
        colors: INTENSITY_COLORS as unknown as string[],
        defaultFill: NEUTRAL_FILL,
        border: BORDER_COLOR,
        scale: 1,
    };

    return (
        <div className={classNames(styles.component, className)}>
            <div className={styles.flipper} data-side={side} onClick={toggleSide}>
                <div className={styles.front}>
                    <Body {...bodyProps} side="front" />
                </div>
                <div className={styles.back}>
                    <Body {...bodyProps} side="back" />
                </div>
            </div>

            <div className={styles.segment}>
                <button
                    type="button"
                    className={classNames(styles.segment_pill, { [styles.segment_pill__active]: side === "front" })}
                    onClick={() => setSide("front")}
                >
                    Спереди
                </button>
                <button
                    type="button"
                    className={classNames(styles.segment_pill, { [styles.segment_pill__active]: side === "back" })}
                    onClick={() => setSide("back")}
                >
                    Сзади
                </button>
            </div>
        </div>
    );
};

export default MuscleAccentComponent;