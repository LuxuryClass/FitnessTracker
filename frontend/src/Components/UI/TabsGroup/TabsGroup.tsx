import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabsGroupProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  type?: 'primary' | 'dark';
}

export const TabsGroup = <T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
  type = 'primary',
}: TabsGroupProps<T>) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const updateIndicator = useCallback(() => {
    const activeElement = tabsRef.current[activeTab];
    const container = containerRef.current;
    if (activeElement && container) {
      const containerStyle = getComputedStyle(container);
      const paddingLeft = parseFloat(containerStyle.paddingLeft);
      const paddingRight = parseFloat(containerStyle.paddingRight);
      
      const elementLeft = activeElement.offsetLeft;
      const elementWidth = activeElement.offsetWidth;
      const containerWidth = container.clientWidth;
      
      const maxLeft = containerWidth - elementWidth - paddingRight;
      const left = Math.max(paddingLeft, Math.min(elementLeft, maxLeft));
      
      setIndicatorStyle({
        left,
        width: elementWidth,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Слушаем ресайз
  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Обновляем при изменении tabs (если контент меняется)
  useEffect(() => {
    updateIndicator();
  }, [tabs, updateIndicator]);

  return (
    <div ref={containerRef} className={cn(styles.tabs, styles[`tabs_${type}`], className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => { tabsRef.current[tab.id] = el; }}
          className={cn(styles.tab, styles[`tab_${type}`], activeTab === tab.id && styles.tab_active)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
      <div
        className={cn(styles.indicator, styles[`indicator_${type}`])}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
    </div>
  );
};