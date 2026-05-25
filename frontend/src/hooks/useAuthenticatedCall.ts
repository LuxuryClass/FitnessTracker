import { useCallback } from 'react';
import { useAuth } from '@/Auth';
import { ApiError } from '@/Auth/authApi';
import { isAccessTokenExpiredOrExpiring } from '@/Auth/security';

/**
 * Возвращает функцию, которая выполняет переданный API-вызов
 * с актуальным access-токеном и автоматически рефрешит сессию:
 *   1) Проактивно — если токен истёк или скоро истечёт, рефреш до запроса.
 *   2) Реактивно — если сервер ответил 401/403, рефреш + один ретрай.
 *
 * Если рефреш не удался — выбрасывается ошибка с понятным сообщением,
 * AuthContext к этому моменту уже очистит сессию и роут-гарды
 * перенаправят на /login.
 */
export const useAuthenticatedCall = () => {
  const { tokens, refreshSession } = useAuth();

  return useCallback(
    async <T>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      if (!tokens?.accessToken) {
        throw new Error('Сессия истекла. Войдите заново.');
      }

      let accessToken = tokens.accessToken;
      if (isAccessTokenExpiredOrExpiring(accessToken)) {
        const refreshed = await refreshSession();
        if (!refreshed?.accessToken) {
          throw new Error('Сессия истекла. Войдите заново.');
        }
        accessToken = refreshed.accessToken;
      }

      try {
        return await fn(accessToken);
      } catch (err) {
        if (!(err instanceof ApiError) || (err.status !== 401 && err.status !== 403)) {
          throw err;
        }
        const refreshed = await refreshSession();
        if (!refreshed?.accessToken) {
          throw new Error('Сессия истекла. Войдите заново.');
        }
        return fn(refreshed.accessToken);
      }
    },
    [tokens?.accessToken, refreshSession],
  );
};
