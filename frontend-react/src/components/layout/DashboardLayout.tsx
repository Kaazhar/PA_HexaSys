import { ReactNode, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/api';
import { Bell, MessageCircle } from 'lucide-react';
import type { Notification } from '../../types';
import PushNotificationButton from '../PushNotificationButton';
import { useTranslation } from 'react-i18next';
import { adminSidebar, particulierSidebar, proSidebar, salarieSidebar } from '../../config/sidebars';

type AdminView = 'admin' | 'particulier' | 'professionnel' | 'salarie';

const ADMIN_VIEWS: AdminView[] = ['admin', 'particulier', 'professionnel', 'salarie'];

const ADMIN_VIEW_SIDEBARS = {
  admin:         adminSidebar,
  particulier:   particulierSidebar,
  professionnel: proSidebar,
  salarie:       salarieSidebar,
};

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems?: NavItem[];
  title?: string;
  noPadding?: boolean;
}

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
];

export default function DashboardLayout({ children, sidebarItems = [], title, noPadding = false }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] ?? 'fr';
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const [adminView, setAdminViewState] = useState<AdminView>(() => {
    if (user?.role !== 'admin') return 'admin';
    return (localStorage.getItem(`admin_view_${user.id}`) as AdminView) ?? 'admin';
  });

  const setAdminView = (view: AdminView) => {
    setAdminViewState(view);
    if (user) localStorage.setItem(`admin_view_${user.id}`, view);
  };

  const effectiveSidebarItems = isAdmin ? ADMIN_VIEW_SIDEBARS[adminView] : sidebarItems;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const notifications: Notification[] = notifData?.data ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar items={effectiveSidebarItems} />

      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {title && <h1 className="text-base font-semibold text-gray-800">{title}</h1>}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {ADMIN_VIEWS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAdminView(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      adminView === v
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t(`nav.admin_view_${v}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            
            <div className="flex items-center gap-1 mr-1">
              {LANGS.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                    currentLang === lang.code
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            
            <PushNotificationButton />

            
            <Link id="tour-messages" to="/messages" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <MessageCircle className="w-5 h-5" />
            </Link>

            
            <div id="tour-notifications" ref={notifRef} className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{t('nav.notifications')}</p>
                    {unreadCount > 0 && <span className="text-xs text-gray-400">{t('dashboard.unread', { count: unreadCount })}</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 px-4 py-4 text-center">{t('nav.no_notifications')}</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} onClick={() => !n.read && markRead.mutate(n.id)}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}>
                          <p className="text-sm text-gray-700">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Link to="/profil" className="flex items-center gap-2.5 hover:bg-gray-50 px-2 py-1.5 rounded-md transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden relative">
              <span className="absolute">{user?.firstname.charAt(0)}{user?.lastname.charAt(0)}</span>
              {user?.avatar_url && (
                <img key={user.avatar_url} src={user.avatar_url} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">{user?.firstname} {user?.lastname}</p>
              <p className="text-xs text-gray-400">{t(`auth.role_labels.${user?.role}`, { defaultValue: user?.role })}</p>
            </div>
          </Link>
        </header>

        
        <main className={`flex-1 overflow-hidden ${noPadding ? '' : 'overflow-y-auto p-5'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
