import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pin, Lock, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { forumService } from '../../services/api';
import { salarieSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { ForumTopic } from '../../types';
import { useTranslation } from 'react-i18next';

export default function SalarieForum() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebar = user?.role === 'admin' ? adminSidebar : salarieSidebar;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topics'],
    queryFn: () => forumService.getTopics({ limit: 100 }),
  });

  const topics: ForumTopic[] = data?.data?.topics ?? [];

  const createMutation = useMutation({
    mutationFn: () => forumService.createTopic({ title: title.trim(), content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
      setTitle('');
      setContent('');
      setShowCreate(false);
      toast.success(t('salarie_forum.topic_created'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || t('common.error')),
  });

  const pinMutation = useMutation({
    mutationFn: (id: number) => forumService.pinTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-topics'] }),
  });

  const lockMutation = useMutation({
    mutationFn: (id: number) => forumService.lockTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-topics'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => forumService.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
      toast.success(t('salarie_forum.topic_deleted'));
    },
  });

  const canSubmit = title.trim().length >= 3 && content.trim().length >= 10;

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('salarie_forum.title')}>
      <div className="max-w-4xl mx-auto">

        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('salarie_forum.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{topics.length}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary"
          >
            {showCreate ? t('salarie_forum.cancel') : t('salarie_forum.new_topic')}
          </button>
        </div>

        
        {showCreate && (
          <div className="bg-white rounded-2xl border-2 border-[#2D5016]/20 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">{t('salarie_forum.create_title')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('salarie_forum.label_title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder={t('salarie_forum.title_placeholder')}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{title.length}/200</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('salarie_forum.label_content')}</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input min-h-[150px] resize-none"
                  placeholder={t('salarie_forum.content_placeholder')}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setTitle(''); setContent(''); }}
                  className="btn-secondary"
                >
                  {t('salarie_forum.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { if (canSubmit) createMutation.mutate(); }}
                  disabled={!canSubmit || createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? t('salarie_forum.publishing') : t('salarie_forum.publish_btn')}
                </button>
              </div>
            </div>
          </div>
        )}

        
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">{t('salarie_forum.no_topics')}</p>
            <p className="text-sm mt-1">{t('salarie_forum.no_topics_sub')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onPin={() => pinMutation.mutate(topic.id)}
                onLock={() => lockMutation.mutate(topic.id)}
                onDelete={() => { if (confirm(t('salarie_forum.delete_confirm'))) deleteMutation.mutate(topic.id); }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function TopicRow({ topic, onPin, onLock, onDelete }: {
  topic: ForumTopic;
  onPin: () => void;
  onLock: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={clsx(
      'bg-white rounded-xl border-2 p-4 flex items-center gap-4',
      topic.is_pinned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {topic.is_pinned && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{t('salarie_forum.pinned')}</span>
          )}
          {topic.is_locked && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t('salarie_forum.locked')}</span>
          )}
          <Link
            to={`/forum/${topic.id}`}
            className="font-semibold text-gray-900 hover:text-[#2D5016] transition-colors truncate"
          >
            {topic.title}
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          {t('forum.by')} <strong className="text-gray-600">{topic.author?.firstname} {topic.author?.lastname}</strong>
          {' · '}{format(new Date(topic.created_at), 'dd MMM yyyy', { locale: fr })}
        </p>
      </div>

      
      <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
        <span>{topic.replies_count} rép.</span>
        <span>{topic.views} vues</span>
      </div>

      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onPin}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            topic.is_pinned ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          )}
          title={topic.is_pinned ? t('salarie_forum.pin_tooltip') : t('salarie_forum.unpin_tooltip')}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onLock}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            topic.is_locked ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          )}
          title={topic.is_locked ? t('salarie_forum.lock_tooltip') : t('salarie_forum.unlock_tooltip')}
        >
          <Lock className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
          title={t('salarie_forum.delete_tooltip')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
