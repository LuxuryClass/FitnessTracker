import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type WorkoutBatchCreatePayload, type WorkoutCreateResponse } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useCreateWorkoutsBatchMutation = () => {
  const callWithAuth = useAuthenticatedCall();
  const queryClient = useQueryClient();

  return useMutation<WorkoutCreateResponse[], Error, WorkoutBatchCreatePayload>({
    mutationFn: (payload) => callWithAuth((token) => authApi.createWorkoutsBatch(token, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
};