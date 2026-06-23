import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/Components/UI/Button/Button';
import { MarkdownContent } from '@/Components/Common/MarkdownContent/MarkdownContent';
import { useGuideArticleQuery } from '@/hooks/useGuideArticleQuery';
import { useAuthenticatedCall } from '@/hooks/useAuthenticatedCall';
import { useAuth } from '@/Auth';
import { authApi, type GuideArticleResponse, type GuideArticleListItem } from '@/Auth/authApi';
import cn from 'classnames';
import styles from './Styles.module.scss';

const GuideArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const callWithAuth = useAuthenticatedCall();

  const { data: article, isPending } = useGuideArticleQuery(id);
  const [isFavPending, setIsFavPending] = useState(false);

  const patchFavorite = (articleId: string, value: boolean) => {
    queryClient.setQueryData<GuideArticleResponse>(['guideArticle', user?.id, articleId], (prev) =>
      prev ? { ...prev, is_favorite: value } : prev,
    );
    queryClient.setQueriesData<GuideArticleListItem[]>(
      { queryKey: ['guideCategoryArticles', user?.id] },
      (prev) => prev?.map((a) => (a.id === articleId ? { ...a, is_favorite: value } : a)),
    );
  };

  const handleFavorite = async () => {
    if (!article || isFavPending) return;

    const next = !article.is_favorite;
    setIsFavPending(true);
    patchFavorite(article.id, next);

    try {
      await callWithAuth((token) =>
        next
          ? authApi.addGuideArticleFavorite(token, article.id)
          : authApi.removeGuideArticleFavorite(token, article.id),
      );
    } catch {
      patchFavorite(article.id, !next);
    } finally {
      setIsFavPending(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(-1)} />
        <h1 className={styles.title}>{article?.title ?? 'Статья'}</h1>
        {article && (
          <button
            className={cn(styles.favBtn, article.is_favorite && styles.favBtn_active)}
            onClick={handleFavorite}
            aria-label="В избранное"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={article.is_favorite ? 'currentColor' : 'none'}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.content}>
        {isPending || !article ? (
          <p className={styles.emptyState}>Загрузка...</p>
        ) : (
          <>
            <div className={styles.meta}>
              <span>{article.reading_time_minutes} минут чтения</span>
            </div>
            <MarkdownContent content={article.content} />
          </>
        )}
      </div>
    </div>
  );
};

export default GuideArticlePage;