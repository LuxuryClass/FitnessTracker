import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@styles/index.scss';
import { App } from '@/App';
import { AuthProvider } from '@/Auth';

registerSW({
  immediate: true,
  onRegisteredSW(_, registration) {
    if (!registration) {
      return;
    }

    void registration.update();
    setInterval(() => {
      void registration.update();
    }, 60_000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
