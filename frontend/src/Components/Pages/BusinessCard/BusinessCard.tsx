import { memo, useCallback } from 'react';
import {
  ScrollEngineProvider,
  useScrollEngine,
} from './engine/ScrollEngine';
import { useReducedMotion } from './engine/hooks';
import { LightRibbon, ribbonX } from './layers/LightRibbon';
import { ProgressRail } from './layers/ProgressRail';
import { TopBar } from './layers/TopBar';
import { GrainOverlay } from './layers/GrainOverlay';
import { SparkField } from './layers/SparkField';
import { Scene1Spark } from './scenes/Scene1Spark';
import { SceneWhy } from './scenes/SceneWhy';
import { FeatureScene } from './scenes/FeatureScene';
import { SceneSteps } from './scenes/SceneSteps';
import { Scene6Return } from './scenes/Scene6Return';
import styles from './BusinessCard.module.scss';

const SCENE_COUNT = 8;

const FEATURES = [
  {
    index: '1',
    kicker: 'ПЛАНИРОВАНИЕ',
    title: 'Планируй неделю наперёд',
    points: [
      'Тренировки по дням в календаре',
      'Видно сделанное и то, что впереди',
      'Серия недель не прерывается',
    ],
    shotSrc: '/business-card/plan.png',
    shotAlt: 'Планирование',
  },
  {
    index: '2',
    kicker: 'КОНСТРУКТОР',
    title: 'Собирай тренировку',
    points: [
      '7 групп мышц на выбор',
      'Упражнения с подходами и весом',
      'Объём считается автоматически',
    ],
    shotSrc: '/business-card/build.png',
    shotAlt: 'Конструктор тренировки',
  },
  {
    index: '3',
    kicker: 'ГЛАВНЫЙ ЭКРАН',
    title: 'Всё важное — сразу',
    points: [
      'Ближайшая тренировка наверху',
      'Серия недель и объём в тоннах',
      'Недавний прогресс по упражнениям',
    ],
    shotSrc: '/business-card/home.png',
    shotAlt: 'Главный экран',
  },
  {
    index: '4',
    kicker: 'ПРОГРЕСС',
    title: 'Следи, как растёшь',
    points: [
      'Объём по неделям и месяцам',
      'Личные рекорды по движениям',
      'Баланс нагрузки на группы мышц',
    ],
    shotSrc: '/business-card/progress.png',
    shotAlt: 'Прогресс',
  },
];

function CardInner({ reducedMotion }: { reducedMotion: boolean }) {
  const { scrollerRef } = useScrollEngine();

  // compute current ribbon x at viewport center, for passive sparks
  const ribbonXAt = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;
    const contentY = scroller.scrollTop + scroller.clientHeight / 2;
    return ribbonX(scroller.clientWidth, contentY, scroller.clientHeight);
  }, [scrollerRef]);

  const jumpToScene = useCallback(
    (sceneIndex: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const total = scroller.scrollHeight - scroller.clientHeight;
      const target = (sceneIndex / (SCENE_COUNT - 1)) * total;
      scroller.scrollTo({ top: target, behavior: 'smooth' });
    },
    [scrollerRef]
  );

  return (
    <div className={styles.root}>
      <div
        className={`${styles.scroller} ${reducedMotion ? styles.reduced : ''}`}
        ref={scrollerRef}
      >
        {/* fixed atmosphere behind everything */}
        <div className={styles.vignette} aria-hidden="true" />

        {/* the spine — spans the full content height, scrolls with content */}
        <LightRibbon reducedMotion={reducedMotion} />

        {/* scenes */}
        <div className={styles.scenes}>
          <Scene1Spark reducedMotion={reducedMotion} />
          <SceneWhy reducedMotion={reducedMotion} />
          <FeatureScene {...FEATURES[0]} flip={false} reducedMotion={reducedMotion} />
          <FeatureScene {...FEATURES[1]} flip={true} reducedMotion={reducedMotion} />
          <SceneSteps reducedMotion={reducedMotion} />
          <FeatureScene {...FEATURES[2]} flip={false} reducedMotion={reducedMotion} />
          <FeatureScene {...FEATURES[3]} flip={true} reducedMotion={reducedMotion} noSnap />
          <Scene6Return reducedMotion={reducedMotion} />
        </div>
      </div>

      {/* viewport-pinned overlays — outside the scroller so they never scroll
          away. pointer-events pass through to the scroller below. */}
      <div className={styles.overlay} aria-hidden="true">
        {!reducedMotion && (
          <SparkField ribbonXAt={ribbonXAt} enabled={!reducedMotion} />
        )}
        <GrainOverlay animate={!reducedMotion} />
      </div>
      <ProgressRail onJump={jumpToScene} />
      <TopBar />
    </div>
  );
}

function BusinessCardComponent() {
  const reducedMotion = useReducedMotion();
  return (
    <ScrollEngineProvider reducedMotion={reducedMotion}>
      <CardInner reducedMotion={reducedMotion} />
    </ScrollEngineProvider>
  );
}

export const BusinessCard = memo(BusinessCardComponent);
export default BusinessCard;
