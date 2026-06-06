import { useCallback, useSyncExternalStore } from 'react';

// Тип события beforeinstallprompt — его нет в lib.dom, объявляем минимально
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Перехватываем beforeinstallprompt на уровне модуля — событие может прийти
// до маунта React-дерева, поэтому храним его в переменной и нотифицируем подписчиков
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });

  // После успешной установки прячем нативный prompt
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return deferredPrompt !== null;
}

// Приложение уже запущено как установленная PWA
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

// iOS/iPadOS: установка возможна только вручную через Safari («Поделиться» → «На экран “Домой”»)
function detectIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  // iPadOS 13+ маскируется под MacIntel, отличаем по touch-точкам
  const isIpadOs =
    window.navigator.platform === 'MacIntel' &&
    window.navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || isIpadOs;
}

export function useInstallPrompt() {
  const canNativeInstall = useSyncExternalStore(subscribe, getSnapshot);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    await prompt.prompt();
    await prompt.userChoice;
    // Prompt одноразовый — после показа обнуляем
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  }, []);

  return {
    isStandalone: detectStandalone(),
    isIos: detectIos(),
    canNativeInstall,
    promptInstall,
  };
}