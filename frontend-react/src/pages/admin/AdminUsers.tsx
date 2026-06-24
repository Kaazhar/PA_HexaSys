import { useState } from 'react';
import { Users, Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, ShieldOff, ShieldCheck, MailX } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { User, UserRole } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { adminSidebar } from '../../config/sidebars';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

interface BanFormData {
  reason: string;
  duration: number;
  is_permanent: boolean;
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  professionnel: 'bg-blue-100 text-blue-800',
  salarie: 'bg-amber-100 text-amber-800',
  particulier: 'bg-green-100 text-green-800',
};

interface UserFormData {
  firstname: string;
  lastname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_verified?: boolean;
  password?: string;
}

function UserForm({ user, onSubmit, isLoading }: { user?: User; onSubmit: (data: UserFormData) => void; isLoading: boolean }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    defaultValues: user ? {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    } : { role: 'particulier', is_active: true },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t('admin_users.form_firstname')}</label>
          <input {...register('firstname', { required: true })} className="input" placeholder="Marie" />
          {errors.firstname && <p className="text-red-500 text-xs mt-1">{t('admin_users.form_required')}</p>}
        </div>
        <div>
          <label className="label">{t('admin_users.form_lastname')}</label>
          <input {...register('lastname', { required: true })} className="input" placeholder="Dupont" />
          {errors.lastname && <p className="text-red-500 text-xs mt-1">{t('admin_users.form_required')}</p>}
        </div>
      </div>
      <div>
        <label className="label">{t('admin_users.form_email')}</label>
        <input {...register('email', { required: true })} type="email" className="input" placeholder="marie@exemple.com" />
        {errors.email && <p className="text-red-500 text-xs mt-1">{t('admin_users.form_required')}</p>}
      </div>
      {!user && (
        <div>
          <label className="label">{t('admin_users.form_password')}</label>
          <input {...register('password', { required: !user, minLength: 6 })} type="password" className="input" placeholder="••••••••" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{t('admin_users.form_min_chars')}</p>}
        </div>
      )}
      <div>
        <label className="label">{t('admin_users.form_role')}</label>
        <select {...register('role')} className="input">
          <option value="particulier">{t('admin_users.role_particulier')}</option>
          <option value="professionnel">{t('admin_users.role_pro')}</option>
          <option value="salarie">{t('admin_users.role_salarie')}</option>
          <option value="admin">{t('admin_users.role_admin')}</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 rounded text-primary-500" />
        <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">{t('admin_users.form_active')}</label>
      </div>
      {!user && (
        <div className="flex items-center gap-3">
          <input {...register('is_verified')} type="checkbox" id="is_verified" className="w-4 h-4 rounded text-primary-500" />
          <label htmlFor="is_verified" className="text-sm text-gray-700 cursor-pointer">{t('admin_users.form_verified')} <span className="text-gray-400">{t('admin_users.form_verified_note')}</span></label>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? t('admin_users.form_saving') : t('admin_users.form_save')}
        </button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [banUser, setBanUser] = useState<User | null>(null);
  const [unbanUserId, setUnbanUserId] = useState<number | null>(null);
  const { register: registerBan, handleSubmit: handleBanSubmit, watch: watchBan, reset: resetBan } = useForm<BanFormData>({
    defaultValues: { duration: 7, is_permanent: false },
  });
  const isPermanentBan = watchBan('is_permanent');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, role: roleFilter, status: statusFilter, page }],
    queryFn: () => userService.getAll({ search, role: roleFilter, status: statusFilter, page, limit: 10 }),
  });

  const users = data?.data?.users || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const roleLabels: Record<UserRole, string> = {
    admin: t('admin_users.role_admin'),
    professionnel: t('admin_users.role_pro'),
    salarie: t('admin_users.role_salarie'),
    particulier: t('admin_users.role_particulier'),
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditUser(null);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData & { password: string }) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreateModal(false);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeleteUserId(null);
      toast.success(t('common.success'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => userService.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('common.success'));
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BanFormData }) => userService.ban(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setBanUser(null);
      resetBan();
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: number) => userService.unban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setUnbanUserId(null);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const resetEmail2FAMutation = useMutation({
    mutationFn: (id: number) => userService.resetEmail2FA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('2FA email réinitialisée');
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_users.title')}>
      <div className="space-y-5">
        
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin_users.search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9"
              />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">{t('admin_users.all_roles')}</option>
              <option value="particulier">{t('admin_users.role_particulier')}</option>
              <option value="professionnel">{t('admin_users.role_pro')}</option>
              <option value="salarie">{t('admin_users.role_salarie')}</option>
              <option value="admin">{t('admin_users.role_admin')}</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">{t('admin_users.all_statuses')}</option>
              <option value="active">{t('admin_users.option_active')}</option>
              <option value="inactive">{t('admin_users.option_inactive')}</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t('admin_users.new_user')}
          </button>
        </div>

        
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{total} {t('admin_users.col_user').toLowerCase()}{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">{t('admin_users.col_user')}</th>
                    <th className="table-header">{t('admin_users.col_email')}</th>
                    <th className="table-header">{t('admin_users.col_role')}</th>
                    <th className="table-header">{t('admin_users.col_status')}</th>
                    <th className="table-header">{t('admin_users.col_joined')}</th>
                    <th className="table-header">{t('admin_users.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className={clsx('hover:bg-gray-50 transition-colors', user.is_banned && 'bg-red-50/40')}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.firstname.charAt(0)}{user.lastname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.firstname} {user.lastname}</p>
                            {!user.is_verified && <p className="text-xs text-amber-500">{t('admin_users.not_verified')}</p>}
                            {user.is_banned && (
                              <p className="text-xs text-red-500 font-medium">
                                {user.ban_expires_at
                                  ? t('admin_users.banned_until', { date: format(new Date(user.ban_expires_at), 'dd/MM/yyyy') })
                                  : t('admin_users.banned_permanently')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{user.email}</td>
                      <td className="table-cell">
                        <span className={clsx('badge', roleColors[user.role])}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', user.is_banned ? 'bg-red-100 text-red-700' : user.is_active ? 'badge-green' : 'badge-red')}>
                          {user.is_banned ? t('admin_users.status_banned') : user.is_active ? t('admin_users.status_active') : t('admin_users.status_inactive')}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditUser(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                            className={clsx('p-1.5 rounded-lg transition-colors', user.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50')}
                            title={user.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          {user.is_banned ? (
                            <button
                              onClick={() => setUnbanUserId(user.id)}
                              className="p-1.5 rounded-lg text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="Débannir"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanUser(user)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Bannir"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          )}
                          {(user as any).email_two_fa_enabled && (
                            <button
                              onClick={() => resetEmail2FAMutation.mutate(user.id)}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Réinitialiser la 2FA email"
                            >
                              <MailX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteUserId(user.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <EmptyState icon={<Users className="w-10 h-10" />} message={t('common.noData')} />
              )}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="px-4 py-3 border-t border-gray-100" />
        </div>

        
        <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={t('admin_users.edit_modal')}>
          {editUser && (
            <UserForm
              user={editUser}
              onSubmit={(data) => updateMutation.mutate({ id: editUser.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </Modal>

        
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('admin_users.create_modal')}>
          <UserForm
            onSubmit={(data) => createMutation.mutate(data as UserFormData & { password: string })}
            isLoading={createMutation.isPending}
          />
        </Modal>

        
        <Modal isOpen={!!deleteUserId} onClose={() => setDeleteUserId(null)} title={t('admin_users.delete_modal')} size="sm">
          <p className="text-gray-600 mb-5">{t('admin_users.delete_msg')}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteUserId(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1"
            >
              {deleteMutation.isPending ? t('admin_users.deleting') : t('common.delete')}
            </button>
          </div>
        </Modal>

        
        <Modal isOpen={!!banUser} onClose={() => { setBanUser(null); resetBan(); }} title={t('admin_users.ban_title', { name: `${banUser?.firstname} ${banUser?.lastname}` })} size="sm">
          <form onSubmit={handleBanSubmit((data) => banUser && banMutation.mutate({ id: banUser.id, data }))} className="space-y-4">
            <div>
              <label className="label">{t('admin_users.ban_reason')}</label>
              <textarea
                {...registerBan('reason', { required: true })}
                className="input resize-none min-h-[80px]"
                placeholder={t('admin_users.ban_placeholder')}
              />
            </div>
            <div className="flex items-center gap-3">
              <input {...registerBan('is_permanent')} type="checkbox" id="is_permanent" className="w-4 h-4 rounded" />
              <label htmlFor="is_permanent" className="text-sm text-gray-700 cursor-pointer">{t('admin_users.ban_permanent')}</label>
            </div>
            {!isPermanentBan && (
              <div>
                <label className="label">{t('admin_users.ban_duration')}</label>
                <input
                  {...registerBan('duration', { valueAsNumber: true, min: 1 })}
                  type="number"
                  className="input"
                  placeholder="7"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setBanUser(null); resetBan(); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={banMutation.isPending} className="btn-danger flex-1">
                {banMutation.isPending ? t('admin_users.banning') : t('admin_users.ban_btn')}
              </button>
            </div>
          </form>
        </Modal>

        
        <Modal isOpen={!!unbanUserId} onClose={() => setUnbanUserId(null)} title={t('admin_users.unban_modal')} size="sm">
          <p className="text-gray-600 mb-5">{t('admin_users.unban_msg')}</p>
          <div className="flex gap-3">
            <button onClick={() => setUnbanUserId(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button
              onClick={() => unbanUserId && unbanMutation.mutate(unbanUserId)}
              disabled={unbanMutation.isPending}
              className="btn-primary flex-1"
            >
              {unbanMutation.isPending ? t('admin_users.unbanning') : t('admin_users.unban_btn')}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
