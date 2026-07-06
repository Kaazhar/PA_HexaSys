import { useEffect, useState } from 'react';
import { X, Plus, Pencil, Trash2, Loader2, ImagePlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { projectService, uploadService } from '../../services/api';
import type { ProjectStepInput } from '../../services/api';
import type { ProjectUpdate } from '../../types';
import LoadingSpinner from './LoadingSpinner';
import ImageCropModal from './ImageCropModal';

interface ProjectStepsManagerProps {
  projectId: number;
  title: string;
  onClose: () => void;
}

const split = (s?: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

export default function ProjectStepsManager({ projectId, title, onClose }: ProjectStepsManagerProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: detailData, isLoading } = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => projectService.getOne(projectId),
  });
  const detail = detailData?.data;
  const steps: ProjectUpdate[] = detail?.updates ?? [];

  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [desc, setDesc] = useState('');
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [tags, setTags] = useState('');

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<'before' | 'after'>('before');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTab(prev => Math.min(prev, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const resetForm = () => { setDesc(''); setBefore([]); setAfter([]); setTags(''); setEditingId(null); };
  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-detail', projectId] });

  const addMutation = useMutation({
    mutationFn: (d: ProjectStepInput) => projectService.addUpdate(projectId, d),
    onSuccess: () => { invalidate(); resetForm(); setMode('view'); setTab(999); toast.success(t('project_steps.added', { defaultValue: 'Étape ajoutée' })); },
    onError: () => toast.error(t('common.error', { defaultValue: 'Erreur' })),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: ProjectStepInput }) => projectService.updateUpdate(projectId, id, d),
    onSuccess: () => { invalidate(); resetForm(); setMode('view'); toast.success(t('project_steps.updated', { defaultValue: 'Étape modifiée' })); },
    onError: () => toast.error(t('common.error', { defaultValue: 'Erreur' })),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.deleteUpdate(projectId, id),
    onSuccess: () => { invalidate(); setMode('view'); setTab(0); },
    onError: () => toast.error(t('common.error', { defaultValue: 'Erreur' })),
  });

  const openAdd = () => { resetForm(); setMode('add'); };
  const openEdit = (s: ProjectUpdate) => {
    setDesc(s.description || s.comment || '');
    setBefore(split(s.before_images));
    setAfter(split(s.after_images));
    setTags(s.tags || '');
    setEditingId(s.id);
    setMode('edit');
  };

  const save = () => {
    if (!desc.trim() && before.length === 0 && after.length === 0) {
      toast.error(t('project_steps.need_content', { defaultValue: 'Ajoutez une description ou une image' }));
      return;
    }
    const d: ProjectStepInput = {
      description: desc.trim(),
      before_images: before.join(','),
      after_images: after.join(','),
      tags: tags.trim(),
    };
    if (mode === 'edit' && editingId != null) updateMutation.mutate({ id: editingId, d });
    else addMutation.mutate(d);
  };

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setCropTarget(target);
    setCropQueue(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const onCropConfirm = async (cropped: File) => {
    setCropQueue(prev => prev.slice(1));
    setUploading(true);
    try {
      const res = await uploadService.upload(cropped);
      if (cropTarget === 'before') setBefore(prev => [...prev, res.data.url]);
      else setAfter(prev => [...prev, res.data.url]);
    } catch {
      toast.error(t('common.error', { defaultValue: 'Erreur' }));
    } finally {
      setUploading(false);
    }
  };

  const saving = addMutation.isPending || updateMutation.isPending;
  const current = steps[tab];

  const gallery = (list: string[], setList: (fn: (p: string[]) => string[]) => void, target: 'before' | 'after', label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {list.map((url, i) => (
          <div key={i} className="relative w-20 h-20">
            <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
            <button type="button" onClick={() => setList(prev => prev.filter((_, j) => j !== i))}
              className="absolute -top-1.5 -right-1.5 bg-white rounded-full border border-gray-200 text-gray-400 hover:text-red-500 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <label className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-600 cursor-pointer text-xs">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
          {t('project_steps.add_image', { defaultValue: 'Ajouter' })}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={e => onPickImages(e, target)} disabled={uploading} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {detail?.followers_count ?? 0} {t('projects_pro.followers', { defaultValue: 'suiveur(s)' })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Onglets des étapes */}
        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-3">
            {steps.map((s, i) => (
              <button key={s.id} onClick={() => { setTab(i); setMode('view'); }}
                className={clsx('px-3 py-1.5 rounded-lg text-sm transition-colors',
                  mode === 'view' && tab === i ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {t('project_steps.step', { defaultValue: 'Étape' })} n°{i + 1}
              </button>
            ))}
            <button onClick={openAdd}
              className={clsx('px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors',
                mode !== 'view' ? 'bg-primary-500 text-white' : 'border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600')}>
              <Plus className="w-4 h-4" /> {t('project_steps.add', { defaultValue: 'Ajouter une étape' })}
            </button>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : mode === 'view' ? (
            steps.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="font-medium">{t('project_steps.empty', { defaultValue: 'Aucune étape pour le moment' })}</p>
                <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 mt-3">
                  <Plus className="w-4 h-4" /> {t('project_steps.add', { defaultValue: 'Ajouter une étape' })}
                </button>
              </div>
            ) : current ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{t('project_steps.step', { defaultValue: 'Étape' })} n°{tab + 1}</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(current)} className="text-xs flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                      <Pencil className="w-3.5 h-3.5" /> {t('common.edit', { defaultValue: 'Modifier' })}
                    </button>
                    <button onClick={() => deleteMutation.mutate(current.id)} disabled={deleteMutation.isPending}
                      className="text-xs flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} {t('common.delete', { defaultValue: 'Supprimer' })}
                    </button>
                  </div>
                </div>
                {(current.description || current.comment) && (
                  <p className="text-sm text-gray-700 whitespace-pre-line">{current.description || current.comment}</p>
                )}
                {split(current.before_images).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('project_steps.before', { defaultValue: 'Avant' })}</p>
                    <div className="flex flex-wrap gap-2">
                      {split(current.before_images).map((src, i) => <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-100" />)}
                    </div>
                  </div>
                )}
                {split(current.after_images).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('project_steps.after', { defaultValue: 'Après' })}</p>
                    <div className="flex flex-wrap gap-2">
                      {split(current.after_images).map((src, i) => <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-100" />)}
                    </div>
                  </div>
                )}
                {/* Compat anciennes avancées (image unique) */}
                {split(current.image_url).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {split(current.image_url).map((src, i) => <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-100" />)}
                  </div>
                )}
                {split(current.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {split(current.tags).map((tag, i) => <span key={i} className="badge bg-primary-50 text-primary-600 text-xs">{tag}</span>)}
                  </div>
                )}
              </div>
            ) : null
          ) : (
            /* Formulaire ajout / édition */
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">
                {mode === 'edit'
                  ? t('project_steps.edit_title', { defaultValue: 'Modifier l\'étape' })
                  : t('project_steps.new_title', { defaultValue: 'Nouvelle étape' })}
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('project_steps.description', { defaultValue: 'Description' })}</label>
                <textarea className="input w-full h-24 resize-none" value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder={t('project_steps.description_ph', { defaultValue: 'Décrivez cette étape...' })} maxLength={1000} />
              </div>
              {gallery(before, setBefore, 'before', t('project_steps.before', { defaultValue: 'Avant' }))}
              {gallery(after, setAfter, 'after', t('project_steps.after', { defaultValue: 'Après' }))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('project_steps.tags', { defaultValue: 'Tags' })}</label>
                <input className="input w-full" value={tags} onChange={e => setTags(e.target.value)} placeholder="mobilier, textile, déco..." />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => { resetForm(); setMode('view'); }} className="btn-secondary">{t('common.cancel', { defaultValue: 'Annuler' })}</button>
                <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {mode === 'edit' ? t('common.save', { defaultValue: 'Enregistrer' }) : t('project_steps.add', { defaultValue: 'Ajouter une étape' })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {cropQueue.length > 0 && (
        <ImageCropModal
          key={`${cropQueue[0].name}-${cropQueue[0].size}-${cropQueue.length}`}
          file={cropQueue[0]}
          onCancel={() => setCropQueue(prev => prev.slice(1))}
          onConfirm={onCropConfirm}
        />
      )}
    </div>
  );
}
