import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/Auth';
import { authApi, type GuideArticleResponse } from '@/Auth/authApi';
import { useAuthenticatedCall } from './useAuthenticatedCall';

export const useGuideArticleQuery = (articleId: string | undefined) => {
  const { tokens, user } = useAuth();
  const callWithAuth = useAuthenticatedCall();

  return useQuery<GuideArticleResponse>({
    queryKey: ['guideArticle', user?.id, articleId],
    queryFn: () => callWithAuth((token) => authApi.getGuideArticle(token, articleId!)),
    enabled: !!tokens?.accessToken && !!articleId,
    staleTime: 1000 * 60 * 2,
  });
};