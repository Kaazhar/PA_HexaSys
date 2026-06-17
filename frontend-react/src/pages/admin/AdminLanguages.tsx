import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, Trash2, Info } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

interface Language {
  id: number;
  code: string;
  name: string;
  label: string;
  flag: string;
  active: boolean;
  created_at: string;
}

export default function AdminLanguages() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', label: '', flag: '' });
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-languages'],
    queryFn: () => api.get('/admin/languages').then(r => r.data as Language[]),
  });
  const languages = data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/admin/languages', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      setShowModal(false);
      setForm({ code: '', name: '', label: '', flag: '' });
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => api.delete(`/admin/languages/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
  });

  const handleDelete = (lang: Language) => {
    if (!window.confirm(t('admin_languages.delete_confirm', { name: lang.name }))) return;
    deleteMutation.mutate(lang.code);
  };

  const handleSubmit = () => {
    setError('');
    if (!form.code || !form.name) {
      setError(t('admin_languages.required_fields'));
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary-600" />
              {t('admin_languages.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('admin_languages.subtitle')}</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setError(''); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('admin_languages.add')}
          </button>
        </div>

        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('admin_languages.libre_info_title')}</p>
            <p>{t('admin_languages.libre_info_desc')}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_languages.col_lang')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_languages.col_code')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_languages.col_added')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_languages.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {languages.map(lang => {
                  const isDefault = lang.code === 'fr' || lang.code === 'en';
                  return (
                    <tr key={lang.code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{lang.flag}</span>
                          <div>
                            <p className="font-medium text-gray-900">{lang.name}</p>
                            <p className="text-xs text-gray-400">{lang.label}</p>
                          </div>
                          {isDefault && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                              {t('admin_languages.default')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">{lang.code}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(lang.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isDefault && (
                            <button
                              onClick={() => handleDelete(lang)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin_languages.modal_title')}</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin_languages.field_code')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase() }))}
                      placeholder="es"
                      className="input-field"
                      maxLength={5}
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('admin_languages.code_hint')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin_languages.field_label')}
                    </label>
                    <input
                      value={form.label}
                      onChange={e => setForm(f => ({ ...f, label: e.target.value.toUpperCase() }))}
                      placeholder="ES"
                      className="input-field"
                      maxLength={5}
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('admin_languages.label_hint')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin_languages.field_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Español"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin_languages.field_flag')}
                  </label>
                  <input
                    value={form.flag}
                    onChange={e => setForm(f => ({ ...f, flag: e.target.value }))}
                    placeholder="🇪🇸"
                    className="input-field"
                    maxLength={4}
                  />
                </div>

              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 text-xs text-amber-800">
                {t('admin_languages.translation_warning')}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? t('common.loading') : t('admin_languages.create_btn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
