import { useState } from 'react';
import { Pencil, Trash2, Eye, X, Check, Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService, projectService } from '../../services/api';
import type { Project } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const emptyForm = { title: '', description: '', before_images: '', after_images: '', tags: '' };

export default function AdminProjects() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Suivi du projet (avancées) — identique au dashboard pro
  const [manageProject, setManageProject] = useState<Project | null>(null);
  const [updateComment, setUpdateComment] = useState('');
  const [updateImageUrls, setUpdateImageUrls] = useState<string[]>(['']);

  const { data: detailData } = useQuery({
    queryKey: ['project-detail', manageProject?.id],
    queryFn: () => projectService.getOne(manageProject!.id),
    enabled: manageProject !== null,
  });
  const detail = detailData?.data;

  const addUpdateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: { image_url: string; comment: string } }) =>
      projectService.addUpdate(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', manageProject?.id] });
      setUpdateComment('');
      setUpdateImageUrls(['']);
      toast.success(t('projects_pro.update_added'));
    },
    onError: () => toast.error(t('projects_pro.update_error')),
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: ({ id, updateId }: { id: number; updateId: number }) =>
      projectService.deleteUpdate(id, updateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-detail', manageProject?.id] }),
  });

  const submitUpdate = () => {
    if (!manageProject) return;
    const urls = updateImageUrls.map(u => u.trim()).filter(Boolean);
    if (urls.length === 0 && !updateComment.trim()) { toast.error(t('projects_pro.update_empty')); return; }
    addUpdateMutation.mutate({ id: manageProject.id, d: { image_url: urls.join(','), comment: updateComment.trim() } });
  };

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
                        <button
                          onClick={() => { setManageProject(p); setUpdateComment(''); setUpdateImageUrls(['']); }}
                          className="p-1.5 text-xs text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title={t('projects_pro.manage_follow')}
                        >
                          ···
                        </button>
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

      {manageProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{manageProject.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {detail?.followers_count ?? 0} {t('projects_pro.followers')}
                </p>
              </div>
              <button onClick={() => setManageProject(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">{t('projects_pro.add_update')}</h4>
                <textarea
                  className="input w-full h-20 resize-none"
                  value={updateComment}
                  onChange={e => setUpdateComment(e.target.value)}
                  placeholder={t('projects_pro.update_comment_ph')}
                  maxLength={500}
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('projects_pro.image_url_label')}</label>
                  {updateImageUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="input flex-1"
                        placeholder={t('projects_pro.image_url_ph')}
                        value={url}
                        onChange={e => setUpdateImageUrls(arr => arr.map((u, j) => j === i ? e.target.value : u))}
                      />
                      {updateImageUrls.length > 1 && (
                        <button type="button" onClick={() => setUpdateImageUrls(arr => arr.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setUpdateImageUrls(arr => [...arr, ''])} className="text-sm text-primary-600 hover:text-primary-700">
                    {t('projects_pro.add_image_url')}
                  </button>
                </div>
                <button onClick={submitUpdate} disabled={addUpdateMutation.isPending} className="btn-primary flex items-center gap-2">
                  {addUpdateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('projects_pro.publish_update')}
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">{t('projects_pro.updates_history')}</h4>
                {!detail?.updates?.length ? (
                  <p className="text-sm text-gray-400">{t('projects_pro.no_updates')}</p>
                ) : (
                  detail.updates.map(u => (
                    <div key={u.id} className="flex gap-3 border border-gray-100 rounded-lg p-3">
                      {u.image_url && (
                        <div className="flex gap-1 flex-shrink-0">
                          {u.image_url.split(',').map(s => s.trim()).filter(Boolean).map((src, i) => (
                            <img key={i} src={src} alt="" className="w-16 h-16 rounded-md object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{u.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{format(new Date(u.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}</p>
                      </div>
                      <button onClick={() => deleteUpdateMutation.mutate({ id: manageProject.id, updateId: u.id })} className="text-gray-300 hover:text-red-500 self-start">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
