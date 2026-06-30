import { useState } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salarieService, workshopService, categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { salarieSidebar } from '../../config/sidebars';
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

const defaultForm: WorkshopForm = {
  title: '', description: '', objective: '',
  location: '', price: '0', max_spots: '15', min_spots: '10',
  type: 'atelier', category_id: '',
  sessions: [{ date: '', duration: '120' }],
  chapters: [],
};

export default function SalarieFormations() {
  const { t } = useTranslation();

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft: { label: t('salarie_formations.cancel'), cls: 'badge-gray' },
    pending: { label: t('dashboard_salarie.status.pending'), cls: 'badge-orange' },
    active: { label: t('dashboard_salarie.status.active'), cls: 'badge-green' },
    cancelled: { label: t('dashboard_salarie.status.cancelled'), cls: 'badge-red' },
  };

  const typeLabels: Record<string, string> = {
    atelier: t('workshops.type.atelier'),
    formation: t('workshops.type.formation'),
    conference: t('workshops.type.conference'),
  };

  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState<WorkshopForm>(defaultForm);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salarie', 'workshops'],
    queryFn: () => salarieService.getMyWorkshops(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const workshops = data?.data || [];
  const categories = categoriesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof workshopService.create>[0]) => workshopService.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'workshops'] });
      setShowForm(false);
      setForm(defaultForm);
      toast.success(t('salarie_formations.create_success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => workshopService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarie', 'workshops'] });
      setCancelId(null);
      setCancelReason('');
      toast.success(t('salarie_formations.cancel_success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessions = form.sessions
      .filter(s => s.date)
      .map(s => ({ date: s.date, duration: Number(s.duration) || 0 }));
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

  // Helpers séances/chapitres
  const addSession = () => setForm(f => ({ ...f, sessions: [...f.sessions, { date: '', duration: '120' }] }));
  const removeSession = (i: number) => setForm(f => ({ ...f, sessions: f.sessions.filter((_, idx) => idx !== i) }));
  const updateSession = (i: number, key: keyof SessionForm, value: string) =>
    setForm(f => ({ ...f, sessions: f.sessions.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }));
  const addChapter = () => setForm(f => ({ ...f, chapters: [...f.chapters, { title: '', content: '' }] }));
  const removeChapter = (i: number) => setForm(f => ({ ...f, chapters: f.chapters.filter((_, idx) => idx !== i) }));
  const updateChapter = (i: number, key: keyof ChapterForm, value: string) =>
    setForm(f => ({ ...f, chapters: f.chapters.map((ch, idx) => (idx === i ? { ...ch, [key]: value } : ch)) }));

  return (
    <DashboardLayout sidebarItems={salarieSidebar} title={t('salarie_formations.title')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('salarie_formations.title')}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{workshops.length}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            {t('salarie_formations.create')}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : workshops.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <p className="font-medium">{t('salarie_formations.no_workshops')}</p>
            <p className="text-sm mt-1">{t('salarie_formations.no_workshops_sub')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workshops.map((ws: { id: number; title: string; date: string; duration: number; location: string; enrolled: number; max_spots: number; min_spots: number; status: string; type: string; price: number; cancel_reason?: string }) => (
              <div
                key={ws.id}
                onClick={() => setDetailId(ws.id)}
                className="card cursor-pointer hover:border-primary-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-gray-900">{ws.title}</h3>
                      <span className="badge-gray text-xs">{typeLabels[ws.type] || ws.type}</span>
                      <span className={clsx('badge text-xs', statusConfig[ws.status]?.cls || 'badge-gray')}>
                        {statusConfig[ws.status]?.label || ws.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{ws.date ? format(new Date(ws.date), 'dd MMMM yyyy à HH:mm', { locale: fr }) : '-'}</span>
                      <span>{ws.duration} min</span>
                      {ws.location && <span>{ws.location}</span>}
                      <span>
                        {ws.enrolled}/{ws.max_spots} {t('salarie_formations.enrolled')}
                        {ws.enrolled < ws.min_spots && (
                          <span className="text-amber-500 text-xs ml-1">(min {ws.min_spots})</span>
                        )}
                      </span>
                    </div>
                    {ws.cancel_reason && (
                      <p className="mt-2 text-xs text-red-600">{t('salarie_formations.cancelled_reason')} {ws.cancel_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-primary-500">{ws.price === 0 ? t('salarie_formations.free') : `${ws.price}€`}</span>
                    {ws.status !== 'cancelled' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCancelId(ws.id); }}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-colors"
                      >
                        {t('salarie_formations.cancel_btn')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">{t('salarie_formations.create_modal_title')}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">{t('salarie_formations.label_title')}</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">{t('salarie_formations.label_desc')}</label>
                <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">
                  {t('salarie_formations.label_objective')}
                </label>
                <textarea
                  className="input min-h-[60px] resize-y"
                  placeholder={t('salarie_formations.objective_placeholder')}
                  value={form.objective}
                  onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('salarie_formations.label_type')}</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="atelier">{t('workshops.type.atelier')}</option>
                    <option value="formation">{t('workshops.type.formation')}</option>
                    <option value="conference">{t('workshops.type.conference')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('salarie_formations.label_category')}</label>
                  <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">{t('salarie_formations.no_category')}</option>
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
                <label className="label">{t('salarie_formations.label_location')}</label>
                <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">{t('salarie_formations.label_price')}</label>
                  <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.5" />
                </div>
                <div>
                  <label className="label">{t('salarie_formations.label_max')}</label>
                  <input type="number" className="input" value={form.max_spots} onChange={e => setForm(f => ({ ...f, max_spots: e.target.value }))} min="1" />
                </div>
                <div>
                  <label className="label">{t('salarie_formations.label_min')}</label>
                  <input type="number" className="input" value={form.min_spots} onChange={e => setForm(f => ({ ...f, min_spots: e.target.value }))} min="1" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">
                    {t('salarie_formations.label_chapters')}
                  </label>
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
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('salarie_formations.cancel')}</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('salarie_formations.create_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {cancelId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-3">{t('salarie_formations.cancel_modal_title')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('salarie_formations.cancel_modal_desc')}</p>
            <textarea
              className="input w-full mb-4 min-h-[80px]"
              placeholder={t('salarie_formations.cancel_reason_placeholder')}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelId(null); setCancelReason(''); }} className="btn-secondary">{t('salarie_formations.back')}</button>
              <button
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: cancelId, reason: cancelReason })}
                className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('salarie_formations.confirm_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}


      {detailId !== null && (
        <WorkshopDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
    </DashboardLayout>
  );
}

function WorkshopDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useTranslation();

  const typeLabels: Record<string, string> = {
    atelier: t('workshops.type.atelier'),
    formation: t('workshops.type.formation'),
    conference: t('workshops.type.conference'),
  };
  const statusLabels: Record<string, string> = {
    draft: t('salarie_formations.cancel'),
    pending: t('dashboard_salarie.status.pending'),
    active: t('dashboard_salarie.status.active'),
    cancelled: t('dashboard_salarie.status.cancelled'),
  };

  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => workshopService.getOne(id),
  });
  const { data: bookingsData, isLoading: bLoading } = useQuery({
    queryKey: ['workshop', id, 'bookings'],
    queryFn: () => workshopService.getBookings(id),
  });

  const ws = wsData?.data;
  const participants = bookingsData?.data?.participants ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900 text-lg">{t('salarie_formations.detail_title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {wsLoading || !ws ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="p-6 space-y-6">

            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{ws.title}</h2>
                <span className="badge-gray text-xs">{typeLabels[ws.type] || ws.type}</span>
                <span className="badge badge-gray text-xs">{statusLabels[ws.status] || ws.status}</span>
              </div>
              {ws.description && <p className="text-sm text-gray-600">{ws.description}</p>}

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {ws.location && <span>{ws.location}</span>}
                <span>{ws.enrolled}/{ws.max_spots} {t('salarie_formations.enrolled')}</span>
                <span className="font-bold text-primary-500">{ws.price === 0 ? t('salarie_formations.free') : `${ws.price}€`}</span>
              </div>
            </div>


            {ws.objective && (
              <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-primary-700 mb-1">{t('salarie_formations.label_objective')}</p>
                <p className="text-sm text-gray-700">{ws.objective}</p>
              </div>
            )}


            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">{t('salarie_formations.label_sessions')}</p>
              <div className="space-y-1.5">
                {(ws.sessions && ws.sessions.length > 0
                  ? ws.sessions
                  : [{ id: 0, date: ws.date, duration: ws.duration, order: 0 }]
                ).map((s, i) => (
                  <div key={s.id || i} className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-400">{i + 1}.</span>
                    <span>{s.date ? format(new Date(s.date), 'dd MMMM yyyy à HH:mm', { locale: fr }) : '-'}</span>
                    <span>{s.duration} min</span>
                  </div>
                ))}
              </div>
            </div>


            {ws.chapters && ws.chapters.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{t('salarie_formations.label_chapters')}</p>
                <div className="space-y-2">
                  {ws.chapters.map((ch, i) => (
                    <div key={ch.id || i} className="border border-gray-100 rounded-xl p-3">
                      <p className="font-medium text-gray-900 text-sm">{i + 1}. {ch.title}</p>
                      {ch.content && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{ch.content}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {t('salarie_formations.enrolled_list')} ({ws.enrolled}/{ws.max_spots})
              </p>
              {bLoading ? (
                <div className="flex justify-center py-6"><LoadingSpinner /></div>
              ) : participants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('salarie_formations.no_enrolled')}</p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {participants.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(p.firstname?.[0] || '').toUpperCase()}
                      </span>
                      <span className="text-gray-800">{p.firstname} {p.lastname}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
