import { MessageSquare, Pin, Lock, Eye, ChevronRight, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { forumService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import clsx from 'clsx';
import type { ForumTopic } from '../../types';
import { useTranslation } from 'react-i18next';

export default function ForumPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const canModerate = user?.role === 'salarie' || user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topics'],
    queryFn: () => forumService.getTopics({ limit: 50 }),
  });

  const topics: ForumTopic[] = data?.data?.topics ?? [];

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('forum.title')}</h1>
            <p className="text-gray-500 mt-1">{t('forum.subtitle')}</p>
          </div>
          {canModerate && (
            <Link to="/salarie/forum" className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              {t('forum.new_topic')}
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-600">{t('forum.no_topics')}</p>
            <p className="text-sm mt-1">{t('forum.no_topics_sub')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function TopicRow({ topic }: { topic: ForumTopic }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  return (
    <Link
      to={`/forum/${topic.id}`}
      className={clsx(
        'flex items-center gap-4 p-4 bg-white rounded-xl border-2 hover:border-[#2D5016]/30 hover:shadow-sm transition-all group',
        topic.is_pinned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
      )}
    >
      
      <div className={clsx(
        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
        topic.is_locked ? 'bg-gray-100' : topic.is_pinned ? 'bg-amber-100' : 'bg-green-50'
      )}>
        {topic.is_locked
          ? <Lock className="w-5 h-5 text-gray-400" />
          : <MessageSquare className={clsx('w-5 h-5', topic.is_pinned ? 'text-amber-500' : 'text-[#2D5016]')} />
        }
      </div>

      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {topic.is_pinned && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              <Pin className="w-3 h-3" /> {t('forum.pinned')}
            </span>
          )}
          {topic.is_locked && (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> {t('forum.locked')}
            </span>
          )}
          {topic.project_id && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#2D5016] bg-green-100 px-2 py-0.5 rounded-full">
              {t('forum.project_tag')}
            </span>
          )}
          <h3 className="font-semibold text-gray-900 group-hover:text-[#2D5016] transition-colors truncate">
            {topic.title}
          </h3>
        </div>
        <p className="text-xs text-gray-400">
          {t('forum.by')} <strong className="text-gray-600">{topic.author?.firstname} {topic.author?.lastname}</strong>
          {' · '}{format(new Date(topic.created_at), 'dd MMM yyyy', { locale: dateLocale })}
        </p>
      </div>

      
      <div className="flex items-center gap-5 flex-shrink-0 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {topic.replies_count}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {topic.views}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2D5016] transition-colors" />
      </div>
    </Link>
  );
}
