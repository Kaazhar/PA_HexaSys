import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems: NavItem[];
  title?: string;
}

export default function DashboardLayout({ children, sidebarItems, title }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar items={sidebarItems} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            {title && <h1 className="text-lg font-semibold text-gray-800">{title}</h1>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.firstname.charAt(0)}{user?.lastname.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user?.firstname} {user?.lastname}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
