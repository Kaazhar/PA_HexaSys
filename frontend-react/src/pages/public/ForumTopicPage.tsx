import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Pin, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { forumService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { ForumPost } from '../../types';
import { useTranslation } from 'react-i18next';

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={clsx(
      'rounded-full bg-[#2D5016] text-white flex items-center justify-center font-bold flex-shrink-0',
      size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
    )}>
      {initials}
    </div>
  );
}

export default function ForumTopicPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const [replyContent, setReplyContent] = useState('');
  const canModerate = user?.role === 'salarie' || user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topic', id],
    queryFn: () => forumService.getTopic(Number(id)),
    enabled: !!id,
  });

  const topic = data?.data?.topic;
  const posts: ForumPost[] = data?.data?.posts ?? [];

  const replyMutation = useMutation({
    mutationFn: () => forumService.createPost(Number(id), replyContent.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topic', id] });
      setReplyContent('');
      toast.success(t('forum.reply_published'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || t('common.error')),
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => forumService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topic', id] });
      toast.success(t('forum.reply_deleted'));
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => forumService.pinTopic(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-topic', id] }),
  });

  const lockMutation = useMutation({
    mutationFn: () => forumService.lockTopic(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-topic', id] }),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: () => forumService.deleteTopic(Number(id)),
    onSuccess: () => {
      toast.success(t('forum.topic_deleted'));
      navigate('/forum');
    },
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </PublicLayout>
    );
  }

  if (!topic) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
          <p className="text-lg font-medium">{t('forum.not_found')}</p>
          <Link to="/forum" className="text-[#2D5016] underline mt-3 inline-block">{t('forum.back')}</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        
        <Link to="/forum" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">{t('forum.back')}</Link>

        
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {topic.is_pinned && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{t('forum.pinned')}</span>
                )}
                {topic.is_locked && (
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t('forum.locked')}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
            </div>

            
            {canModerate && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => pinMutation.mutate()}
                  className={clsx('p-2 rounded-lg transition-colors text-sm flex items-center gap-1',
                    topic.is_pinned ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                  title={topic.is_pinned ? t('forum.unpin_tooltip') : t('forum.pin_tooltip')}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => lockMutation.mutate()}
                  className={clsx('p-2 rounded-lg transition-colors',
                    topic.is_locked ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                  title={topic.is_locked ? t('forum.unlock_tooltip') : t('forum.lock_tooltip')}
                >
                  <Lock className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(t('forum.delete_confirm'))) deleteTopicMutation.mutate(); }}
                  className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={`${topic.author?.firstname ?? '?'} ${topic.author?.lastname ?? ''}`} />
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {topic.author?.firstname} {topic.author?.lastname}
                {(topic.author?.role === 'salarie' || topic.author?.role === 'admin') && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#2D5016] text-white font-medium">
                    {topic.author.role === 'admin' ? t('forum.role_admin') : t('forum.staff')}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                {format(new Date(topic.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: dateLocale })}
                {' · '}{topic.views} {t('forum.views')}
              </p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-5">
            {topic.content}
          </div>
        </div>

        
        {posts.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="font-semibold text-gray-700 text-sm px-1">
              {posts.length} {t('forum.replies')}
            </h2>
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i + 1}
                canDelete={canModerate || post.author_id === user?.id}
                onDelete={() => deletePostMutation.mutate(post.id)}
              />
            ))}
          </div>
        )}

        
        {topic.is_locked ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-5 text-center text-gray-400">
            <p className="text-sm">{t('forum.locked_msg')}</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-green-50 border-2 border-[#2D5016]/20 rounded-xl p-5 text-center">
            <p className="text-sm text-gray-600 mb-3">{t('forum.login_to_reply')}</p>
            <Link to="/login" className="btn-primary text-sm">{t('forum.login_btn')}</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{t('forum.your_reply')}</h3>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="input min-h-[120px] resize-none mb-3"
              placeholder={t('forum.reply_placeholder')}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { if (replyContent.trim()) replyMutation.mutate(); }}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="btn-primary"
              >
                {replyMutation.isPending ? t('forum.sending') : t('forum.reply_btn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function PostCard({ post, index, canDelete, onDelete }: {
  post: ForumPost;
  index: number;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const authorName = `${post.author?.firstname ?? '?'} ${post.author?.lastname ?? ''}`;
  const isStaff = post.author?.role === 'salarie' || post.author?.role === 'admin';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <Avatar name={authorName} size="sm" />
        <span className="text-xs text-gray-300 font-mono">#{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{authorName}</span>
            {isStaff && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#2D5016] text-white font-medium">
                {post.author?.role === 'admin' ? t('forum.role_admin') : t('forum.staff')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {format(new Date(post.created_at), "dd MMM yyyy 'à' HH:mm", { locale: dateLocale })}
            </span>
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{post.content}</p>
      </div>
    </div>
  );
}
