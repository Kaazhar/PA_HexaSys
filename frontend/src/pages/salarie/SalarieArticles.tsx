import { useState } from 'react';
import { FileText, Plus, X, Loader2, Eye, Edit2, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salarieService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { salarieSidebar } from '../../config/sidebars';

interface Article {
  id: number;
  title: string;
  content: string;
  tags: string;
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
}

interface ArticleForm {
  title: string;
  content: string;
  tags: string;
  status: string;
}

const defaultForm: ArticleForm = { title: '', content: '', tags: '', status: 'draft' };

export default function SalarieArticles() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [preview, setPreview] = useState<Article | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salarie', 'articles'],
    queryFn: () => salarieService.getMyArticles(),
  });

  const articles: Article[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: ArticleForm) => salarieService.createArticle(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'articles'] });
      setShowForm(false);
      setForm(defaultForm);
      toast.success('Article créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ArticleForm> }) =>
      salarieService.updateArticle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'articles'] });
      setEditArticle(null);
      setForm(defaultForm);
      toast.success('Article mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => salarieService.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'articles'] });
      setDeleteId(null);
      toast.success('Article supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const openEdit = (article: Article) => {
    setEditArticle(article);
    setForm({ title: article.title, content: article.content, tags: article.tags || '', status: article.status });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editArticle) {
      updateMutation.mutate({ id: editArticle.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isFormOpen = showForm || editArticle !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout sidebarItems={salarieSidebar} title="Espace Salarié">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mes articles</h2>
            <p className="text-gray-500 text-sm mt-0.5">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditArticle(null); setForm(defaultForm); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Écrire un article
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : articles.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun article rédigé</p>
            <p className="text-sm mt-1">Partagez vos connaissances sur l'upcycling</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div key={article.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{article.title}</h3>
                      <span className={clsx('badge text-xs', article.status === 'published' ? 'badge-green' : 'badge-gray')}>
                        {article.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    {article.content && (
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{article.content}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.views} vues</span>
                      <span>{format(new Date(article.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                      {article.tags && <span className="text-primary-400">{article.tags}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPreview(article)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Aperçu"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(article)}
                      className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(article.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">
                {editArticle ? 'Modifier l\'article' : 'Écrire un article'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditArticle(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Titre *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Contenu</label>
                <textarea
                  className="input min-h-[200px] resize-y font-normal"
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Rédigez votre article..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tags</label>
                  <input className="input" placeholder="upcycling, textile, ..." value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Statut</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publier</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditArticle(null); }} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editArticle ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">{preview.content || 'Aucun contenu.'}</p>
              {preview.tags && (
                <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-gray-100">
                  {preview.tags.split(',').map(tag => (
                    <span key={tag} className="badge-gray text-xs">{tag.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-2">Supprimer l'article ?</h3>
            <p className="text-sm text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">Annuler</button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
                className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
