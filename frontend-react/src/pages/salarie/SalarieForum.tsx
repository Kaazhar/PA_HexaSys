import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Pin, Lock, Trash2, MessageSquare, Eye, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { forumService } from '../../services/api';
import { salarieSidebar } from '../../config/sidebars';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { ForumTopic } from '../../types';

export default function SalarieForum() {
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
      toast.success('Sujet créé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur'),
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
      toast.success('Sujet supprimé');
    },
  });

  const canSubmit = title.trim().length >= 3 && content.trim().length >= 10;

  return (
    <DashboardLayout sidebarItems={salarieSidebar} title="Forum">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du forum</h1>
            <p className="text-sm text-gray-500 mt-0.5">{topics.length} sujet{topics.length > 1 ? 's' : ''} au total</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary flex items-center gap-2"
          >
            {showCreate ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {showCreate ? 'Annuler' : 'Nouveau sujet'}
          </button>
        </div>

        {/* Formulaire création */}
        {showCreate && (
          <div className="bg-white rounded-2xl border-2 border-[#2D5016]/20 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Créer un nouveau sujet</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder="Titre du sujet..."
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{title.length}/200</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input min-h-[150px] resize-none"
                  placeholder="Rédigez le contenu du sujet..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setTitle(''); setContent(''); }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => { if (canSubmit) createMutation.mutate(); }}
                  disabled={!canSubmit || createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Création...' : 'Publier le sujet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des sujets */}
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-600">Aucun sujet</p>
            <p className="text-sm mt-1">Créez le premier sujet du forum !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onPin={() => pinMutation.mutate(topic.id)}
                onLock={() => lockMutation.mutate(topic.id)}
                onDelete={() => { if (confirm('Supprimer ce sujet et toutes ses réponses ?')) deleteMutation.mutate(topic.id); }}
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
  return (
    <div className={clsx(
      'bg-white rounded-xl border-2 p-4 flex items-center gap-4',
      topic.is_pinned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
    )}>
      {/* Icône */}
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        topic.is_locked ? 'bg-gray-100' : topic.is_pinned ? 'bg-amber-100' : 'bg-green-50'
      )}>
        <MessageSquare className={clsx(
          'w-5 h-5',
          topic.is_locked ? 'text-gray-400' : topic.is_pinned ? 'text-amber-500' : 'text-[#2D5016]'
        )} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {topic.is_pinned && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Épinglé</span>
          )}
          {topic.is_locked && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Verrouillé</span>
          )}
          <Link
            to={`/forum/${topic.id}`}
            className="font-semibold text-gray-900 hover:text-[#2D5016] transition-colors truncate"
          >
            {topic.title}
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Par <strong className="text-gray-600">{topic.author?.firstname} {topic.author?.lastname}</strong>
          {' · '}{format(new Date(topic.created_at), 'dd MMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{topic.replies_count}</span>
        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{topic.views}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onPin}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            topic.is_pinned ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          )}
          title={topic.is_pinned ? 'Désépingler' : 'Épingler'}
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
          title={topic.is_locked ? 'Déverrouiller' : 'Verrouiller'}
        >
          <Lock className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
