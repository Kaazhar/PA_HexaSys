import { ReactNode, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/api';
import { Bell, MessageCircle } from 'lucide-react';
import type { Notification } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems?: NavItem[];
  title?: string;
}

const roleLabels: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  salarie: 'Salarié',
  admin: 'Administrateur',
};

export default function DashboardLayout({ children, sidebarItems = [], title }: DashboardLayoutProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
      <Sidebar items={sidebarItems} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            {title && <h1 className="text-base font-semibold text-gray-800">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            {/* Messages */}
            <Link to="/messages" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <MessageCircle className="w-5 h-5" />
            </Link>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
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
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    {unreadCount > 0 && <span className="text-xs text-gray-400">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 px-4 py-4 text-center">Aucune notification</p>
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
            <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">
              {user?.firstname.charAt(0)}{user?.lastname.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">{user?.firstname} {user?.lastname}</p>
              <p className="text-xs text-gray-400">{roleLabels[user?.role || ''] || user?.role}</p>
            </div>
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
