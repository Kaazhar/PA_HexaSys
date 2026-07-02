import { useState } from 'react';
import { CheckCircle, XCircle, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workshopService, categoryService } from '../../services/api';
import toast from 'react-hot-toast';
import type { Workshop } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { adminSidebar } from '../../config/sidebars';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { workshopStatuses } from '../../config/statuses';
import { useTranslation } from 'react-i18next';

interface SessionForm {
  date: string;
  duration: string;
}

interface ChapterForm {
  title: string;
  content: string;
}

interface WorkshopForm {
  title: string;
  description: string;
  objective: string;
  location: string;
  price: string;
  max_spots: string;
  min_spots: string;
  type: string;
  category_id: string;
  sessions: SessionForm[];
  chapters: ChapterForm[];
}

const defaultWorkshopForm: WorkshopForm = {
  title: '', description: '', objective: '',
  location: '', price: '0', max_spots: '15', min_spots: '10',
  type: 'atelier', category_id: '',
  sessions: [{ date: '', duration: '120' }],
  chapters: [],
};

export default function AdminWorkshops() {
  const { t } = useTranslation();

  const typeLabels: Record<string, string> = {
    atelier: t('workshops.type.atelier'),
    formation: t('workshops.type.formation'),
    conference: t('workshops.type.conference'),
  };

  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [cancelWorkshop, setCancelWorkshop] = useState<Workshop | null>(null);
  const [deleteWorkshopId, setDeleteWorkshopId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'workshops', { status: statusFilter, page }],
    queryFn: () => workshopService.getAdminAll({ status: statusFilter, page, limit: 15 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const workshops = data?.data?.workshops || [];
  const total = data?.data?.total || 0;
  const categories = categoriesData?.data || [];

  const [form, setForm] = useState<WorkshopForm>(defaultWorkshopForm);
  const resetForm = () => setForm(defaultWorkshopForm);

  const addSession = () => setForm(f => ({ ...f, sessions: [...f.sessions, { date: '', duration: '120' }] }));
  const removeSession = (i: number) => setForm(f => ({ ...f, sessions: f.sessions.filter((_, idx) => idx !== i) }));
  const updateSession = (i: number, key: keyof SessionForm, value: string) =>
    setForm(f => ({ ...f, sessions: f.sessions.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }));
  const addChapter = () => setForm(f => ({ ...f, chapters: [...f.chapters, { title: '', content: '' }] }));
  const removeChapter = (i: number) => setForm(f => ({ ...f, chapters: f.chapters.filter((_, idx) => idx !== i) }));
  const updateChapter = (i: number, key: keyof ChapterForm, value: string) =>
    setForm(f => ({ ...f, chapters: f.chapters.map((ch, idx) => (idx === i ? { ...ch, [key]: value } : ch)) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessions = form.sessions
      .filter(s => s.date)
      .map(s => ({ date: new Date(s.date).toISOString(), duration: Number(s.duration) || 0 }));
    if (sessions.length === 0) {
      toast.error(t('salarie_formations.need_session'));
      return;
    }
    const chapters = form.chapters
      .filter(ch => ch.title.trim() || ch.content.trim())
      .map(ch => ({ title: ch.title.trim(), content: ch.content.trim() }));
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description?.trim(),
      objective: form.objective?.trim(),
      date: sessions[0].date,
      duration: sessions[0].duration,
      location: form.location.trim(),
      price: Number(form.price),
      max_spots: Number(form.max_spots),
      min_spots: Number(form.min_spots),
      type: form.type,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      sessions,
      chapters,
    });
  };

  const validateMutation = useMutation({
    mutationFn: (id: number) => workshopService.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof workshopService.create>[0]) => workshopService.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setShowCreate(false);
      resetForm();
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => workshopService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setCancelWorkshop(null);
      setCancelReason('');
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workshopService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      setDeleteWorkshopId(null);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const checkEnrollmentMutation = useMutation({
    mutationFn: () => workshopService.checkEnrollment(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      toast.success(res.data.message || t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_workshops.title')}>
      <div className="space-y-5">
        
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'active', 'draft', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {s === '' ? t('admin_workshops.all') : workshopStatuses[s]?.label || s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => checkEnrollmentMutation.mutate()}
              disabled={checkEnrollmentMutation.isPending}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={clsx('w-4 h-4', checkEnrollmentMutation.isPending && 'animate-spin')} />
              {t('admin_workshops.check_enrollments')}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary whitespace-nowrap">
              {t('admin_workshops.new')}
            </button>
          </div>
        </div>

        
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">{total} {t('admin_workshops.col_workshop').toLowerCase()}{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">{t('admin_workshops.col_workshop')}</th>
                    <th className="table-header">{t('admin_workshops.col_type')}</th>
                    <th className="table-header">{t('admin_workshops.col_date')}</th>
                    <th className="table-header">{t('admin_workshops.col_location')}</th>
                    <th className="table-header">{t('admin_workshops.col_spots')}</th>
                    <th className="table-header">{t('admin_workshops.col_price')}</th>
                    <th className="table-header">{t('admin_workshops.col_enrollments')}</th>
                    <th className="table-header">{t('admin_workshops.col_status')}</th>
                    <th className="table-header">{t('admin_workshops.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workshops.map((workshop: Workshop) => (
                    <tr key={workshop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900 line-clamp-1">{workshop.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{workshop.instructor ? `${workshop.instructor.firstname} ${workshop.instructor.lastname}` : ''}</p>
                      </td>
                      <td className="table-cell">
                        <span className="badge-blue">{typeLabels[workshop.type] || workshop.type}</span>
                      </td>
                      <td className="table-cell text-gray-500 text-xs">
                        {workshop.date ? format(new Date(workshop.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </td>
                      <td className="table-cell text-gray-500 text-xs">{workshop.location}</td>
                      <td className="table-cell text-gray-700">
                        <span className={clsx('text-sm', workshop.enrolled >= workshop.max_spots ? 'text-red-500 font-medium' : '')}>
                          {workshop.enrolled}/{workshop.max_spots}
                        </span>
                      </td>
                      <td className="table-cell font-medium text-gray-700">
                        {workshop.price === 0 ? t('admin_workshops.free') : `${workshop.price}€`}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <span className={clsx('font-medium', workshop.enrolled < (workshop.min_spots || 10) ? 'text-orange-500' : 'text-gray-700')}>
                            {workshop.enrolled}/{workshop.max_spots}
                          </span>
                          <p className="text-xs text-gray-400">min. {workshop.min_spots || 10}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={workshop.status} config={workshopStatuses} />
                        {workshop.cancel_reason && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate" title={workshop.cancel_reason}>
                            {workshop.cancel_reason}
                          </p>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          {workshop.status === 'pending' && (
                            <button
                              onClick={() => validateMutation.mutate(workshop.id)}
                              disabled={validateMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t('admin_workshops.validate_btn')}
                            </button>
                          )}
                          {workshop.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelWorkshop(workshop)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {t('admin_workshops.cancel_btn')}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteWorkshopId(workshop.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={t('admin_workshops.delete_tooltip')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workshops.length === 0 && (
                <EmptyState message={t('common.noData')} />
              )}
            </div>
          )}
        </div>

        
        <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title={t('admin_workshops.create_modal')} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('admin_workshops.label_title')}</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="label">{t('admin_workshops.label_desc')}</label>
              <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('salarie_formations.label_objective')}</label>
              <textarea
                className="input min-h-[60px] resize-y"
                placeholder={t('salarie_formations.objective_placeholder')}
                value={form.objective}
                onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin_workshops.label_type')}</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="atelier">{t('workshops.type.atelier')}</option>
                  <option value="formation">{t('workshops.type.formation')}</option>
                  <option value="conference">{t('workshops.type.conference')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('admin_workshops.label_category')}</label>
                <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">{t('admin_workshops.select_category')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{t('salarie_formations.label_sessions')}</label>
                <button type="button" onClick={addSession} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  {t('salarie_formations.add_session')}
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">{t('salarie_formations.sessions_hint')}</p>
              <div className="space-y-2">
                {form.sessions.map((s, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">{t('salarie_formations.session_date')}</label>
                      <input type="datetime-local" className="input" value={s.date} onChange={e => updateSession(i, 'date', e.target.value)} required />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-gray-500">{t('salarie_formations.session_duration')}</label>
                      <input type="number" className="input" value={s.duration} onChange={e => updateSession(i, 'duration', e.target.value)} min="15" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSession(i)}
                      disabled={form.sessions.length === 1}
                      className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                      title={t('salarie_formations.remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t('admin_workshops.label_location')}</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">{t('admin_workshops.label_price')}</label>
                <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.5" />
              </div>
              <div>
                <label className="label">{t('admin_workshops.label_max')}</label>
                <input type="number" className="input" value={form.max_spots} onChange={e => setForm(f => ({ ...f, max_spots: e.target.value }))} min="1" />
              </div>
              <div>
                <label className="label">{t('salarie_formations.label_min')}</label>
                <input type="number" className="input" value={form.min_spots} onChange={e => setForm(f => ({ ...f, min_spots: e.target.value }))} min="1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{t('salarie_formations.label_chapters')}</label>
                <button type="button" onClick={addChapter} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  {t('salarie_formations.add_chapter')}
                </button>
              </div>
              {form.chapters.length === 0 ? (
                <p className="text-xs text-gray-400">{t('salarie_formations.no_chapter')}</p>
              ) : (
                <div className="space-y-3">
                  {form.chapters.map((ch, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 w-5">{i + 1}.</span>
                        <input
                          className="input flex-1"
                          placeholder={t('salarie_formations.chapter_title')}
                          value={ch.title}
                          onChange={e => updateChapter(i, 'title', e.target.value)}
                        />
                        <button type="button" onClick={() => removeChapter(i)} className="p-2 text-gray-400 hover:text-red-500" title={t('salarie_formations.remove')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        className="input min-h-[60px] resize-y"
                        placeholder={t('salarie_formations.chapter_content')}
                        value={ch.content}
                        onChange={e => updateChapter(i, 'content', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {createMutation.isPending ? t('admin_workshops.creating') : t('admin_workshops.create_btn')}
              </button>
            </div>
          </form>
        </Modal>

        
        <Modal isOpen={!!cancelWorkshop} onClose={() => { setCancelWorkshop(null); setCancelReason(''); }} title={t('admin_workshops.cancel_modal')} size="sm">
          <p className="text-sm text-gray-600 mb-3">
            <strong>{cancelWorkshop?.title}</strong>
          </p>
          <div className="mb-4">
            <label className="label">{t('admin_workshops.cancel_reason')}</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input resize-none min-h-[80px]"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCancelWorkshop(null); setCancelReason(''); }} className="btn-secondary flex-1">{t('admin_workshops.close')}</button>
            <button
              onClick={() => cancelWorkshop && cancelReason.trim() && cancelMutation.mutate({ id: cancelWorkshop.id, reason: cancelReason })}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              className="btn-danger flex-1"
            >
              {cancelMutation.isPending ? t('admin_workshops.cancelling') : t('admin_workshops.confirm_cancel')}
            </button>
          </div>
        </Modal>

        
        <Modal isOpen={!!deleteWorkshopId} onClose={() => setDeleteWorkshopId(null)} title={t('admin_workshops.delete_modal')} size="sm">
          <p className="text-gray-600 mb-5">
            {t('admin_workshops.delete_modal_desc')}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteWorkshopId(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button
              onClick={() => deleteWorkshopId && deleteMutation.mutate(deleteWorkshopId)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1"
            >
              {deleteMutation.isPending ? t('admin_users.deleting') : t('common.delete')}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
