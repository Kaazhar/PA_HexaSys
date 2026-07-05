import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { proSidebar } from '../../config/sidebars';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectStepsManager from '../../components/common/ProjectStepsManager';
import { projectService } from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Project } from '../../types';
import { useTranslation } from 'react-i18next';

type FormData = {
  title: string;
  description: string;
  before_images: string;
  after_images: string;
  tags: string;
};

const emptyForm: FormData = {
  title: '',
  description: '',
  before_images: '',
  after_images: '',
  tags: '',
};

export default function ProjetsPro() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [manageProject, setManageProject] = useState<Project | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => projectService.getMine(),
  });

  const projects = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: FormData) => projectService.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-projects'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: FormData }) => projectService.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-projects'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-projects'] }); setDeleteId(null); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description,
      before_images: p.before_images,
      after_images: p.after_images,
      tags: p.tags || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error(t('projects_pro.title_required')); return; }
    const trimmed = { ...form, title: form.title.trim(), description: form.description?.trim() };
    if (editing) {
      updateMutation.mutate({ id: editing.id, d: trimmed });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout sidebarItems={proSidebar} title={t('projects_pro.title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('projects_pro.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('projects_pro.subtitle')}</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('projects_pro.new')}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 font-medium">{t('projects_pro.empty')}</p>
            <p className="text-sm text-gray-400 mb-4">{t('projects_pro.empty_sub')}</p>
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('projects_pro.create')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1">{p.title}</h3>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => setManageProject(p)} className="p-1.5 text-xs text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-md transition-colors" title={t('projects_pro.manage_follow')}>
                      ···
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-md transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>

                {p.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.tags.split(',').map((tag, i) => (
                      <span key={i} className="badge bg-primary-50 text-primary-600 text-xs">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
                  <span>{format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                  <div className="flex items-center gap-3">
                    <span>{p.views} vues</span>
                    <span>{p.likes} ♡</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? t('projects_pro.modal_edit') : t('projects_pro.modal_new')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects_pro.label_title')}</label>
                <input
                  className="input w-full"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Mon projet upcycling"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects_pro.label_description')}</label>
                <textarea
                  className="input w-full h-24 resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre projet..."
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects_pro.label_before')}</label>
                <input
                  className="input w-full"
                  value={form.before_images}
                  onChange={e => setForm(f => ({ ...f, before_images: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects_pro.label_after')}</label>
                <input
                  className="input w-full"
                  value={form.after_images}
                  onChange={e => setForm(f => ({ ...f, after_images: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects_pro.label_tags')}</label>
                <input
                  className="input w-full"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="mobilier, textile, déco..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={closeModal} className="btn-secondary">{t('projects_pro.cancel')}</button>
              <button onClick={handleSubmit} disabled={isPending || !form.title.trim()} className="btn-primary">
                {isPending ? t('projects_pro.saving') : editing ? t('projects_pro.save_edit') : t('projects_pro.save_create')}
              </button>
            </div>
          </div>
        </div>
      )}


      {manageProject && (
        <ProjectStepsManager
          projectId={manageProject.id}
          title={manageProject.title}
          onClose={() => setManageProject(null)}
        />
      )}


      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('projects_pro.delete_title')}</h3>
            <p className="text-sm text-gray-500 mb-5">{t('projects_pro.delete_msg')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">{t('projects_pro.cancel')}</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {deleteMutation.isPending ? t('projects_pro.deleting') : t('projects_pro.delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
