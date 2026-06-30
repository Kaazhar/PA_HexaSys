import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { articleService } from '../../services/api';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default function ConseilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;

  const { data, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => articleService.getOne(Number(id)),
    enabled: !!id,
  });

  const article = data?.data;

  const readingTime = article
    ? Math.max(1, Math.ceil(article.content.split(/\s+/).length / 200))
    : 0;

  const tags = article?.tags
    ? article.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
          <p className="text-lg font-medium">{t('conseils.not_found')}</p>
          <Link to="/conseils" className="text-[#2D5016] underline mt-3 inline-block">{t('conseils.back')}</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        
        <Link to="/conseils" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          {t('conseils.back')}
        </Link>

        
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-[#2D5016] font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>

        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#2D5016] text-white flex items-center justify-center text-xs font-bold">
              {article.author?.firstname?.charAt(0)}{article.author?.lastname?.charAt(0)}
            </div>
            <span className="font-medium text-gray-700">
              {article.author?.firstname} {article.author?.lastname}
            </span>
          </div>
          <span>{format(new Date(article.created_at), 'dd MMMM yyyy', { locale: dateLocale })}</span>
          <span>{readingTime} {t('conseils.reading_time')}</span>
          <span>{article.views} {t('conseils.views')}</span>
        </div>

        
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line text-base">
          {article.content}
        </div>

        
        <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
          <Link to="/conseils" className="text-sm text-[#2D5016] hover:underline">
            {t('conseils.back')}
          </Link>
          <Link to="/forum" className="text-sm text-gray-500 hover:text-gray-700">
            {t('conseils.discuss')}
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
