import { useState } from 'react';
import { LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign, Settings, Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
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

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces', path: '/admin/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations', path: '/admin/formations', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Conteneurs', path: '/admin/conteneurs', icon: <Package className="w-4 h-4" /> },
  { label: 'Finance', path: '/admin/finance', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Configuration', path: '/admin/config', icon: <Settings className="w-4 h-4" /> },
];

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  professionnel: 'bg-blue-100 text-blue-800',
  salarie: 'bg-amber-100 text-amber-800',
  particulier: 'bg-green-100 text-green-800',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  professionnel: 'Professionnel',
  salarie: 'Salarié',
  particulier: 'Particulier',
};

interface UserFormData {
  firstname: string;
  lastname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
}

function UserForm({ user, onSubmit, isLoading }: { user?: User; onSubmit: (data: UserFormData) => void; isLoading: boolean }) {
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
          <label className="label">Prénom</label>
          <input {...register('firstname', { required: true })} className="input" placeholder="Marie" />
          {errors.firstname && <p className="text-red-500 text-xs mt-1">Requis</p>}
        </div>
        <div>
          <label className="label">Nom</label>
          <input {...register('lastname', { required: true })} className="input" placeholder="Dupont" />
          {errors.lastname && <p className="text-red-500 text-xs mt-1">Requis</p>}
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input {...register('email', { required: true })} type="email" className="input" placeholder="marie@exemple.com" />
        {errors.email && <p className="text-red-500 text-xs mt-1">Requis</p>}
      </div>
      {!user && (
        <div>
          <label className="label">Mot de passe</label>
          <input {...register('password', { required: !user, minLength: 6 })} type="password" className="input" placeholder="••••••••" />
          {errors.password && <p className="text-red-500 text-xs mt-1">Minimum 6 caractères</p>}
        </div>
      )}
      <div>
        <label className="label">Rôle</label>
        <select {...register('role')} className="input">
          <option value="particulier">Particulier</option>
          <option value="professionnel">Professionnel</option>
          <option value="salarie">Salarié</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 rounded text-primary-500" />
        <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">Compte actif</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, role: roleFilter, status: statusFilter, page }],
    queryFn: () => userService.getAll({ search, role: roleFilter, status: statusFilter, page, limit: 10 }),
  });

  const users = data?.data?.users || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditUser(null);
      toast.success('Utilisateur mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData & { password: string }) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreateModal(false);
      toast.success('Utilisateur créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeleteUserId(null);
      toast.success('Utilisateur supprimé');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => userService.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Statut modifié');
    },
  });

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Gestion des utilisateurs">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9"
              />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">Tous les rôles</option>
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
              <option value="salarie">Salarié</option>
              <option value="admin">Admin</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nouvel utilisateur
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{total} utilisateur{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Utilisateur</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Rôle</th>
                    <th className="table-header">Statut</th>
                    <th className="table-header">Inscription</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.firstname.charAt(0)}{user.lastname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.firstname} {user.lastname}</p>
                            {!user.is_verified && <p className="text-xs text-amber-500">Non vérifié</p>}
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
                        <span className={clsx('badge', user.is_active ? 'badge-green' : 'badge-red')}>
                          {user.is_active ? 'Actif' : 'Inactif'}
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
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Modifier l'utilisateur">
          {editUser && (
            <UserForm
              user={editUser}
              onSubmit={(data) => updateMutation.mutate({ id: editUser.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </Modal>

        {/* Create Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Créer un utilisateur">
          <UserForm
            onSubmit={(data) => createMutation.mutate(data as UserFormData & { password: string })}
            isLoading={createMutation.isPending}
          />
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal isOpen={!!deleteUserId} onClose={() => setDeleteUserId(null)} title="Confirmer la suppression" size="sm">
          <p className="text-gray-600 mb-5">Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteUserId(null)} className="btn-secondary flex-1">Annuler</button>
            <button
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
