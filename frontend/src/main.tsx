import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
