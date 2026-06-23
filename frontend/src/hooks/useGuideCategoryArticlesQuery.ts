import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type GuideArticleListItem } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useGuideCategoryArticlesQuery = (categoryId: string | undefined) => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<GuideArticleListItem[]>({
    queryKey: ['guideCategoryArticles', user?.id, categoryId],
    queryFn: () => callWithAuth((token) => authApi.getGuideCategoryArticles(token, categoryId!)),
    enabled: !!tokens?.accessToken && !!categoryId,
    staleTime: 1000 * 60 * 10,
  });
};