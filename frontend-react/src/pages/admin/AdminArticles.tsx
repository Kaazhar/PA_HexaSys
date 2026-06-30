import { useState } from 'react';
import { Pencil, Trash2, Eye, X, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/api';
import type { Article } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const emptyForm = { title: '', content: '', tags: '', status: 'published' };

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewArticle, setViewArticle] = useState<Article | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-articles'],
    queryFn: () => adminService.getArticles(),
  });

  const articles = (data?.data as unknown as Article[]) ?? [];

  const createMutation = useMutation({
    mutationFn: (d: Partial<Article>) => adminService.createArticle(d),
    onSuccess: () => { toast.success('Article créé'); queryClient.invalidateQueries({ queryKey: ['admin-articles'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Article> }) => adminService.updateArticle(id, data),
    onSuccess: () => { toast.success('Article mis à jour'); queryClient.invalidateQueries({ queryKey: ['admin-articles'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteArticle(id),
    onSuccess: () => { toast.success('Article supprimé'); queryClient.invalidateQueries({ queryKey: ['admin-articles'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const openCreate = () => { setForm(emptyForm); setEditing({}); setIsNew(true); };
  const openEdit = (a: Article) => { setForm({ title: a.title, content: a.content, tags: a.tags ?? '', status: a.status }); setEditing(a); setIsNew(false); };
  const closeModal = () => { setEditing(null); setIsNew(false); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Titre et contenu requis'); return; }
    if (isNew) {
      createMutation.mutate(form);
    } else if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data: form });
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Gestion des conseils">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Conseils & articles</h1>
          <button onClick={openCreate} className="btn-primary">
            Nouvel article
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Titre</th>
                  <th className="table-header">Auteur</th>
                  <th className="table-header">Tags</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Vues</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {articles.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900 max-w-xs">
                      <p className="line-clamp-1">{a.title}</p>
                    </td>
                    <td className="table-cell text-gray-500">
                      {a.author ? `${a.author.firstname} ${a.author.lastname}` : `#${a.author_id}`}
                    </td>
                    <td className="table-cell text-gray-400 text-xs">{a.tags || '—'}</td>
                    <td className="table-cell">
                      <span className={`badge ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">{a.views}</td>
                    <td className="table-cell text-gray-400 text-xs">
                      {format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1.5">
                        <button onClick={() => setViewArticle(a)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`Supprimer "${a.title}" ?`)) deleteMutation.mutate(a.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Aucun article</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{isNew ? 'Nouvel article' : 'Modifier l\'article'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titre</label>
                <input className="input w-full" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contenu</label>
                <textarea className="input w-full h-48 resize-none" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tags (virgules)</label>
                  <input className="input w-full" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="upcycling, mobilier, déco" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Statut</label>
                  <select className="input w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="published">Publié</option>
                    <option value="draft">Brouillon</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={closeModal} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex items-center gap-2">
                <Check className="w-4 h-4" /> {isNew ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewArticle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{viewArticle.title}</h3>
              <button onClick={() => setViewArticle(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">Par {viewArticle.author ? `${viewArticle.author.firstname} ${viewArticle.author.lastname}` : `#${viewArticle.author_id}`} · {format(new Date(viewArticle.created_at), 'dd MMM yyyy', { locale: fr })}</p>
            {viewArticle.tags && <p className="text-xs text-primary-600 mb-4">{viewArticle.tags}</p>}
            <p className="text-gray-700 whitespace-pre-line">{viewArticle.content}</p>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { openEdit(viewArticle); setViewArticle(null); }} className="btn-secondary flex items-center gap-2"><Pencil className="w-4 h-4" /> Modifier</button>
              <button onClick={() => setViewArticle(null)} className="btn-primary">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
