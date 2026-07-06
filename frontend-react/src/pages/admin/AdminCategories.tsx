import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { Category } from '../../types';
import { adminSidebar } from '../../config/sidebars';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

const emptyForm = { name: '', slug: '', description: '', icon: '', color: '#2D5016', is_active: true };

export default function AdminCategories() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const categories: Category[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => categoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setForm(emptyForm);
      setError('');
    },
    onError: () => setError(t('admin_categories.create_error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      setForm(emptyForm);
      setError('');
    },
    onError: () => setError(t('admin_categories.update_error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('admin_categories.name_required')); return; }
    const slug = form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const payload = { ...form, slug };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || '', color: cat.color || '#2D5016', is_active: cat.is_active });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_categories.title')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">{categories.length} {t('admin_categories.col_category').toLowerCase()}{categories.length > 1 ? 's' : ''}</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              {t('admin_categories.new')}
            </button>
          )}
        </div>

        {showForm && (
          <div className="card border-primary-200">
            <h2 className="font-semibold text-gray-900 mb-4">{editingId ? t('admin_categories.edit_title') : t('admin_categories.create_title')}</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_categories.label_name')}</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_categories.label_slug')}</label>
                <input className="input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder={t('admin_categories.slug_auto')} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_categories.label_desc')}</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_categories.label_icon')}</label>
                <input className="input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder={t('admin_categories.icon_placeholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_categories.label_color')}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                  <input className="input flex-1" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">{t('admin_categories.label_active')}</label>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4" /> {editingId ? t('admin_categories.edit_btn') : t('admin_categories.create_btn')}
                </button>
                <button type="button" onClick={cancelForm} className="btn-secondary flex items-center gap-2 text-sm">
                  <X className="w-4 h-4" /> {t('admin_categories.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : categories.length === 0 ? (
          <EmptyState message={t('admin_categories.no_categories')} />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin_categories.col_category')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">{t('admin_categories.col_slug')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">{t('admin_categories.col_desc')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('admin_categories.col_status')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{t('admin_categories.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: cat.color || '#2D5016' }}>
                          {cat.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{cat.slug}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell truncate max-w-xs">{cat.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${cat.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {cat.is_active ? t('admin_categories.status_active') : t('admin_categories.status_inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(t('admin_categories.delete_confirm', { name: cat.name }))) deleteMutation.mutate(cat.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
