import { useState, useRef } from 'react';
import { Loader2, Camera, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, newsletterService, uploadService, scoreService } from '../../services/api';
import PhoneVerification from '../../components/PhoneVerification';
import TwoFAToggle from '../../components/TwoFAToggle';
import EmailTwoFAToggle from '../../components/EmailTwoFAToggle';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { User as UserType } from '../../types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { adminSidebar, particulierSidebar, proSidebar, salarieSidebar } from '../../config/sidebars';

const roleColors: Record<string, string> = {
  particulier: 'bg-blue-50 text-blue-700',
  professionnel: 'bg-violet-50 text-violet-700',
  salarie: 'bg-amber-50 text-amber-700',
  admin: 'bg-red-50 text-red-700',
};

const roleGradients: Record<string, string> = {
  particulier: 'from-blue-500 to-blue-700',
  professionnel: 'from-violet-500 to-violet-700',
  salarie: 'from-amber-500 to-amber-600',
  admin: 'from-red-500 to-red-700',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerPanelOpen, setBannerPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'infos' | 'securite' | 'preferences'>('infos');

  const BANNER_COLORS = [
    '#2D5016', '#1e40af', '#7c3aed', '#b45309', '#be185d',
    '#0f766e', '#c2410c', '#1d4ed8', '#047857', '#9333ea',
    '#b91c1c', '#0369a1',
  ];

  const sidebar =
    user?.role === 'admin' ? adminSidebar
    : user?.role === 'professionnel' ? proSidebar
    : user?.role === 'salarie' ? salarieSidebar
    : particulierSidebar;

  const { data: scoreData } = useQuery({
    queryKey: ['score', 'me'],
    queryFn: () => scoreService.getMyScore(),
    enabled: !!user,
  });
  const score = scoreData?.data;

  const handleBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerLoading(true);
    try {
      const uploadRes = await uploadService.upload(file);
      const saveRes = await authService.updateBanner({ banner_url: uploadRes.data.url, banner_color: '' });
      updateUser(saveRes.data);
      setBannerPanelOpen(false);
      toast.success('Bannière mise à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour de la bannière');
    } finally {
      setBannerLoading(false);
      e.target.value = '';
    }
  };

  const handleBannerColor = async (color: string) => {
    try {
      const saveRes = await authService.updateBanner({ banner_color: color, banner_url: '' });
      updateUser(saveRes.data);
      setBannerPanelOpen(false);
      toast.success('Bannière mise à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour de la bannière');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const uploadRes = await uploadService.upload(file);
      const saveRes = await authService.updateAvatar(uploadRes.data.url);
      updateUser(saveRes.data);
      toast.success(t('profile.avatar_updated'));
    } catch {
      toast.error(t('profile.avatar_error'));
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

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

  const [newsletter, setNewsletter] = useState(user?.newsletter_subscribed || false);

  const handleUserUpdated = (updatedUser: UserType) => updateUser(updatedUser);

  const profileMutation = useMutation({
    mutationFn: (data: any) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success(t('profile.profile_updated'));
    },
    onError: () => toast.error(t('profile.profile_error')),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => authService.changePassword(data),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success(t('profile.password_updated'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || t('profile.profile_error'));
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({
      ...profileForm,
      firstname: profileForm.firstname.trim(),
      lastname: profileForm.lastname.trim(),
      address: profileForm.address?.trim(),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t('profile.password_mismatch'));
      return;
    }
    passwordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  if (!user) return null;

  const initials = `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
  const gradient = roleGradients[user.role] || 'from-gray-500 to-gray-700';

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('profile.title', { defaultValue: 'Mon profil' })}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="relative h-28 group">
            {user.banner_url ? (
              <img src={user.banner_url} alt="Bannière" className="w-full h-full object-cover" />
            ) : user.banner_color ? (
              <div className="w-full h-full" style={{ backgroundColor: user.banner_color }} />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${gradient}`} />
            )}
            <button
              type="button"
              onClick={() => setBannerPanelOpen(o => !o)}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100"
            >
              Modifier la bannière
            </button>
            {bannerPanelOpen && (
              <div className="absolute top-2 right-2 z-10 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">Personnaliser la bannière</span>
                  <button type="button" onClick={() => setBannerPanelOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {BANNER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleBannerColor(color)}
                      className="w-9 h-9 rounded-lg border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: user.banner_color === color ? '#fff' : 'transparent',
                        outline: user.banner_color === color ? `2px solid ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerLoading}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  {bannerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Uploader une image
                </button>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerImage} />
              </div>
            )}
          </div>
          <div className="bg-white px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-primary-500 flex items-center justify-center text-white text-2xl font-bold hover:ring-2 hover:ring-primary-400 transition-all group"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {avatarLoading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </div>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <Link
                to={`/utilisateurs/${user.id}`}
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
              >
                Voir mon profil public
              </Link>
            </div>

            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{user.firstname} {user.lastname}</h1>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', roleColors[user.role] || 'bg-gray-100 text-gray-700')}>
                    {t(`auth.role_labels.${user.role}`, { defaultValue: user.role })}
                  </span>
                  {user.siret_verified && (
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      SIRET vérifié
                    </span>
                  )}
                  {user.is_banned && (
                    <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      Suspendu
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 flex-wrap">
                  <span>{user.email}</span>
                  {user.created_at && (
                    <span>Membre depuis {format(new Date(user.created_at), 'MMMM yyyy', { locale: fr })}</span>
                  )}
                </div>
              </div>

              {score && (
                <div className="bg-primary-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-primary-500 font-medium">Score upcycling</p>
                  <p className="text-xl font-bold text-primary-700">{score.total_points} pts</p>
                  <p className="text-xs text-primary-400">{score.level}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['infos', 'securite', 'preferences'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'infos' ? 'Informations' : tab === 'securite' ? 'Sécurité' : 'Préférences'}
            </button>
          ))}
        </div>

        {activeTab === 'infos' && (
          <div className="space-y-5">
            <div className="card">
              <div className="mb-5">
                <h2 className="font-semibold text-gray-900">{t('profile.personal_info')}</h2>
              </div>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('profile.firstname')}</label>
                    <input className="input" value={profileForm.firstname} onChange={e => setProfileForm(f => ({ ...f, firstname: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('profile.lastname')}</label>
                    <input className="input" value={profileForm.lastname} onChange={e => setProfileForm(f => ({ ...f, lastname: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('profile.phone')}</label>
                  <input className="input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" type="tel" />
                </div>
                <div>
                  <label className="label">{t('profile.address')}</label>
                  <input className="input" value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder={t('profile.address')} />
                </div>
                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={profileMutation.isPending} className="btn-primary flex items-center gap-2">
                    {profileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('profile.save')}
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('profile.my_account')}</h2>
              <dl className="space-y-0 text-sm divide-y divide-gray-50">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900 font-medium">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-gray-500">{t('profile.role')}</dt>
                  <dd><span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', roleColors[user.role] || 'bg-gray-100 text-gray-700')}>{t(`auth.role_labels.${user.role}`, { defaultValue: user.role })}</span></dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-gray-500">{t('profile.status')}</dt>
                  <dd><span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{user.is_active ? t('profile.account_active') : t('profile.account_inactive')}</span></dd>
                </div>
                {user.siret && (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-gray-500">SIRET</dt>
                    <dd className="font-mono text-gray-900">{user.siret}</dd>
                  </div>
                )}
                {user.address && (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-gray-500">{t('profile.address')}</dt>
                    <dd className="text-gray-900 text-right">{user.address}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'securite' && (
          <div className="space-y-5">
            <div className="card">
              <div className="mb-5">
                <h2 className="font-semibold text-gray-900">{t('profile.change_password')}</h2>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('profile.current_password')}</label>
                  <input type="password" className="input" value={passwordForm.current_password} onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))} placeholder="••••••••" autoComplete="current-password" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('profile.new_password')}</label>
                    <input type="password" className="input" value={passwordForm.new_password} onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} placeholder="••••••••" minLength={6} autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="label">{t('profile.confirm_password')}</label>
                    <input type="password" className="input" value={passwordForm.confirm_password} onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>
                {passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                  <p className="text-xs text-red-500">{t('profile.password_mismatch')}</p>
                )}
                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={passwordMutation.isPending || !passwordForm.current_password || !passwordForm.new_password} className="btn-primary flex items-center gap-2">
                    {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('profile.update_password')}
                  </button>
                </div>
              </form>
            </div>

            <PhoneVerification currentPhone={user.phone} isVerified={user.phone_verified} onSuccess={handleUserUpdated} />
            <EmailTwoFAToggle isEnabled={user.email_two_fa_enabled} onSuccess={handleUserUpdated} />
            <TwoFAToggle isEnabled={user.two_fa_enabled} isPhoneVerified={user.phone_verified} onSuccess={handleUserUpdated} />
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-5">
            <div className="card">
              <div className="mb-5">
                <h2 className="font-semibold text-gray-900">{t('profile.newsletter')}</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('profile.newsletter_sub')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('profile.newsletter_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !newsletter;
                    setNewsletter(next);
                    newsletterService.toggle(next).then(() => {
                      toast.success(next ? t('profile.subscribed_newsletter') : t('profile.unsubscribed_newsletter'));
                      updateUser({ ...user, newsletter_subscribed: next });
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newsletter ? 'bg-primary-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newsletter ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
