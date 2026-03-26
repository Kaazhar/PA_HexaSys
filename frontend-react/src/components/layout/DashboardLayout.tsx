import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar items={sidebarItems} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            {title && <h1 className="text-base font-semibold text-gray-800">{title}</h1>}
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
