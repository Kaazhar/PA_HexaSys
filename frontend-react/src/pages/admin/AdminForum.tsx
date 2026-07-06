import { useState } from 'react';
import { Pin, Lock, Trash2, Eye, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { forumService } from '../../services/api';
import type { ForumTopic, ForumPost } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export default function AdminForum() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-forum', page],
    queryFn: () => forumService.getTopics({ page, limit: 20 }),
  });

  const topics = data?.data?.topics ?? [];
  const total = data?.data?.total ?? 0;

  const filtered = search
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : topics;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => forumService.deleteTopic(id),
    onSuccess: () => { toast.success(t('admin_forum.deleted')); queryClient.invalidateQueries({ queryKey: ['admin-forum'] }); },
    onError: () => toast.error(t('common.error')),
  });

  const pinMutation = useMutation({
    mutationFn: (id: number) => forumService.pinTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-forum'] }),
    onError: () => toast.error(t('common.error')),
  });

  const lockMutation = useMutation({
    mutationFn: (id: number) => forumService.lockTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-forum'] }),
    onError: () => toast.error(t('common.error')),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => forumService.createTopic(data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['admin-forum'] });
      setShowCreate(false);
      setNewTopic({ title: '', content: '' });
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_forum.title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('admin_forum.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('admin_forum.subjects_total', { count: total })}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            {t('admin_forum.new_topic')}
          </button>
        </div>

        <div className="max-w-sm">
          <input
            type="text"
            placeholder={t('admin_forum.search_ph')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">{t('admin_forum.col_topic')}</th>
                  <th className="table-header">{t('admin_forum.col_author')}</th>
                  <th className="table-header">{t('admin_forum.col_replies')}</th>
                  <th className="table-header">{t('admin_forum.col_views')}</th>
                  <th className="table-header">{t('admin_forum.col_status')}</th>
                  <th className="table-header">{t('admin_forum.col_date')}</th>
                  <th className="table-header">{t('admin_forum.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{topic.title}</p>
                    </td>
                    <td className="table-cell text-gray-500">
                      {topic.author ? `${topic.author.firstname} ${topic.author.lastname}` : `#${topic.author_id}`}
                    </td>
                    <td className="table-cell text-gray-500">{topic.replies_count}</td>
                    <td className="table-cell text-gray-500">{topic.views}</td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        {topic.is_pinned && <span className="badge bg-blue-100 text-blue-700">{t('admin_forum.badge_pinned')}</span>}
                        {topic.is_locked && <span className="badge bg-amber-100 text-amber-700">{t('admin_forum.badge_locked')}</span>}
                        {!topic.is_pinned && !topic.is_locked && <span className="text-gray-400 text-xs">{t('admin_forum.badge_normal')}</span>}
                      </div>
                    </td>
                    <td className="table-cell text-gray-400 text-xs">
                      {format(new Date(topic.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <Link
                          to={`/salarie/forum/${topic.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('admin_forum.btn_view')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => pinMutation.mutate(topic.id)}
                          className={clsx('p-1.5 rounded-lg transition-colors', topic.is_pinned ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50')}
                          title={topic.is_pinned ? t('admin_forum.btn_unpin') : t('admin_forum.btn_pin')}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => lockMutation.mutate(topic.id)}
                          className={clsx('p-1.5 rounded-lg transition-colors', topic.is_locked ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50')}
                          title={topic.is_locked ? t('admin_forum.btn_unlock') : t('admin_forum.btn_lock')}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(t('admin_forum.confirm_delete', { title: topic.title }))) deleteMutation.mutate(topic.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('admin_forum.btn_delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t('admin_forum.no_topics')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="flex gap-2 justify-center">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">{t('admin_forum.prev')}</button>
            <span className="flex items-center text-sm text-gray-500">{t('admin_forum.page', { page })}</span>
            <button disabled={topics.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary">{t('admin_forum.next')}</button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{t('admin_forum.modal_title')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin_forum.label_title')}</label>
                <input className="input w-full" value={newTopic.title} onChange={e => setNewTopic(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin_forum.label_content')}</label>
                <textarea className="input w-full h-32 resize-none" value={newTopic.content} onChange={e => setNewTopic(f => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button
                onClick={() => { if (newTopic.title && newTopic.content) createMutation.mutate(newTopic); }}
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
