import { useState } from 'react';
import { User, Mail, Phone, MapPin, Lock, BadgeCheck, Calendar, Loader2, ShieldAlert } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, newsletterService } from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const roleLabels: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  salarie: 'Salarié',
  admin: 'Administrateur',
};

const roleColors: Record<string, string> = {
  particulier: 'bg-blue-50 text-blue-700',
  professionnel: 'bg-violet-50 text-violet-700',
  salarie: 'bg-amber-50 text-amber-700',
  admin: 'bg-red-50 text-red-700',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [newsletter, setNewsletter] = useState((user as any)?.newsletter_subscribed || false);

  const profileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profil mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      authService.changePassword(data),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Mot de passe modifié');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    passwordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  if (!user) return null;

  const initials = `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-gray-200">
          <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{user.firstname} {user.lastname}</h1>
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', roleColors[user.role] || 'bg-gray-100 text-gray-700')}>
                {roleLabels[user.role] || user.role}
              </span>
              {user.siret_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  <BadgeCheck className="w-3 h-3" /> SIRET vérifié
                </span>
              )}
              {user.is_banned && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
                  <ShieldAlert className="w-3 h-3" /> Banni
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              {user.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Membre depuis {format(new Date(user.created_at), 'MMMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informations */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Informations personnelles</h2>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input
                    className="input"
                    value={profileForm.firstname}
                    onChange={e => setProfileForm(f => ({ ...f, firstname: e.target.value }))}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input
                    className="input"
                    value={profileForm.lastname}
                    onChange={e => setProfileForm(f => ({ ...f, lastname: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Téléphone
                </label>
                <input
                  className="input"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  type="tel"
                />
              </div>
              <div>
                <label className="label">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Adresse
                </label>
                <input
                  className="input"
                  value={profileForm.address}
                  onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Votre adresse"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={profileMutation.isPending} className="btn-primary flex items-center gap-2">
                  {profileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>

          {/* Mot de passe */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label">Mot de passe actuel</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.current_password}
                  onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">Confirmer</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={passwordMutation.isPending || !passwordForm.current_password || !passwordForm.new_password}
                  className="btn-primary flex items-center gap-2"
                >
                  {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Modifier le mot de passe
                </button>
              </div>
            </form>
          </div>

          {/* Newsletter */}
          <div className="card mt-4">
            <h2 className="font-semibold text-gray-900 mb-4">Newsletter</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Recevoir la newsletter</p>
                <p className="text-xs text-gray-400 mt-0.5">Actus, nouveaux ateliers, conseils upcycling</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !newsletter;
                  setNewsletter(next);
                  newsletterService.toggle(next).then(() =>
                    toast.success(next ? 'Inscrit à la newsletter' : 'Désinscrit de la newsletter')
                  );
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newsletter ? 'bg-primary-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newsletter ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Compte */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Mon compte</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900 font-medium">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <dt className="text-gray-500">Rôle</dt>
                <dd>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', roleColors[user.role] || 'bg-gray-100 text-gray-700')}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <dt className="text-gray-500">Statut</dt>
                <dd>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </dd>
              </div>
              {user.siret && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <dt className="text-gray-500">SIRET</dt>
                  <dd className="font-mono text-gray-900">{user.siret}</dd>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <dt className="text-gray-500">Téléphone</dt>
                  <dd className="text-gray-900">{user.phone}</dd>
                </div>
              )}
              {user.address && (
                <div className="flex items-center justify-between py-2">
                  <dt className="text-gray-500">Adresse</dt>
                  <dd className="text-gray-900 text-right">{user.address}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
