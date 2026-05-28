import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type WorkoutCreatePayload, type WorkoutCreateResponse } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useCreateWorkoutMutation = () => {
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  return useMutation<WorkoutCreateResponse, Error, WorkoutCreatePayload>({
    mutationFn: (payload) => callWithAuth((token) => authApi.createWorkout(token, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
};
