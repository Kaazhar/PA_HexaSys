import { useState } from 'react';
import { Pencil, Trash2, Eye, X, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/api';
import type { Project } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const emptyForm = { title: '', description: '', before_images: '', after_images: '', tags: '' };

export default function AdminProjects() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => adminService.getProjects(),
  });

  const projects = (data?.data as unknown as Project[]) ?? [];
  const filtered = search
    ? projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const createMutation = useMutation({
    mutationFn: (d: Partial<Project>) => adminService.createProject(d),
    onSuccess: () => { toast.success('Projet créé'); queryClient.invalidateQueries({ queryKey: ['admin-projects'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => adminService.updateProject(id, data),
    onSuccess: () => { toast.success('Projet mis à jour'); queryClient.invalidateQueries({ queryKey: ['admin-projects'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteProject(id),
    onSuccess: () => { toast.success('Projet supprimé'); queryClient.invalidateQueries({ queryKey: ['admin-projects'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erreur'),
  });

  const openCreate = () => { setForm(emptyForm); setEditing({}); setIsNew(true); };
  const openEdit = (p: Project) => {
    setForm({ title: p.title, description: p.description, before_images: p.before_images ?? '', after_images: p.after_images ?? '', tags: p.tags ?? '' });
    setEditing(p);
    setIsNew(false);
  };
  const closeModal = () => { setEditing(null); setIsNew(false); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    if (isNew) { createMutation.mutate(form); }
    else if (editing?.id) { updateMutation.mutate({ id: editing.id, data: form }); }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Gestion des projets">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projets upcycling</h1>
            <p className="text-sm text-gray-500 mt-0.5">{projects.length} projets</p>
          </div>
          <button onClick={openCreate} className="btn-primary">
            Nouveau projet
          </button>
        </div>

        <div className="max-w-sm">
          <input
            type="text"
            placeholder="Rechercher..."
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
                  <th className="table-header">Titre</th>
                  <th className="table-header">Auteur</th>
                  <th className="table-header">Tags</th>
                  <th className="table-header">Vues</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{p.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{p.description}</p>
                    </td>
                    <td className="table-cell text-gray-500">
                      {p.user ? `${p.user.firstname} ${p.user.lastname}` : `#${p.user_id}`}
                    </td>
                    <td className="table-cell text-gray-400 text-xs">{p.tags || '—'}</td>
                    <td className="table-cell text-gray-500">{p.views}</td>
                    <td className="table-cell text-gray-400 text-xs">
                      {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Supprimer "${p.title}" ?`)) deleteMutation.mutate(p.id); }}
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
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Aucun projet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{isNew ? 'Nouveau projet' : 'Modifier le projet'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titre</label>
                <input className="input w-full" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea className="input w-full h-24 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Images avant (URLs, virgules)</label>
                <input className="input w-full" value={form.before_images} onChange={e => setForm(f => ({ ...f, before_images: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Images après (URLs, virgules)</label>
                <input className="input w-full" value={form.after_images} onChange={e => setForm(f => ({ ...f, after_images: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tags (virgules)</label>
                <input className="input w-full" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="mobilier, textile, déco" />
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
    </DashboardLayout>
  );
}
