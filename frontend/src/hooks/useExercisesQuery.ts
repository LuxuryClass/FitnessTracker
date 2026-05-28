import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type Exercise } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useExercisesQuery = () => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<Exercise[]>({
    queryKey: ['exercises', user?.id],
    queryFn: () =>
      callWithAuth(async (token) => {
        const [system, mine] = await Promise.all([
          authApi.getSystemExercises(token),
          authApi.getExercises(token),
        ]);
        return [...system, ...mine];
      }),
    enabled: !!tokens?.accessToken,
    staleTime: 1000 * 60 * 5,
  });
};
