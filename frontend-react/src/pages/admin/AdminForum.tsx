import { useState } from 'react';
import { MessageSquare, Pin, Lock, Trash2, Eye, Search, Plus, X, Check } from 'lucide-react';
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

export default function AdminForum() {
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
    onSuccess: () => { toast.success('Topic supprimé'); queryClient.invalidateQueries({ queryKey: ['admin-forum'] }); },
    onError: () => toast.error('Erreur'),
  });

  const pinMutation = useMutation({
    mutationFn: (id: number) => forumService.pinTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-forum'] }),
  });

  const lockMutation = useMutation({
    mutationFn: (id: number) => forumService.lockTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-forum'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => forumService.createTopic(data),
    onSuccess: () => {
      toast.success('Topic créé');
      queryClient.invalidateQueries({ queryKey: ['admin-forum'] });
      setShowCreate(false);
      setNewTopic({ title: '', content: '' });
    },
    onError: () => toast.error('Erreur'),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Gestion du forum">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Forum</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} sujets au total</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau sujet
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un sujet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Sujet</th>
                  <th className="table-header">Auteur</th>
                  <th className="table-header">Réponses</th>
                  <th className="table-header">Vues</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Actions</th>
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
                        {topic.is_pinned && <span className="badge bg-blue-100 text-blue-700">Épinglé</span>}
                        {topic.is_locked && <span className="badge bg-amber-100 text-amber-700">Verrouillé</span>}
                        {!topic.is_pinned && !topic.is_locked && <span className="text-gray-400 text-xs">Normal</span>}
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
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => pinMutation.mutate(topic.id)}
                          className={clsx('p-1.5 rounded-lg transition-colors', topic.is_pinned ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50')}
                          title={topic.is_pinned ? 'Désépingler' : 'Épingler'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => lockMutation.mutate(topic.id)}
                          className={clsx('p-1.5 rounded-lg transition-colors', topic.is_locked ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50')}
                          title={topic.is_locked ? 'Déverrouiller' : 'Verrouiller'}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Supprimer "${topic.title}" ?`)) deleteMutation.mutate(topic.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucun sujet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="flex gap-2 justify-center">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">Précédent</button>
            <span className="flex items-center text-sm text-gray-500">Page {page}</span>
            <button disabled={topics.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary">Suivant</button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Nouveau sujet</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titre</label>
                <input className="input w-full" value={newTopic.title} onChange={e => setNewTopic(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contenu</label>
                <textarea className="input w-full h-32 resize-none" value={newTopic.content} onChange={e => setNewTopic(f => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => { if (newTopic.title && newTopic.content) createMutation.mutate(newTopic); }}
                disabled={createMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
