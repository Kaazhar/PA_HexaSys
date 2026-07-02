import { Link, useLocation } from 'react-router-dom';
import { LogOut, UserCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
}

export default function Sidebar({ items, collapsed = false }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className={clsx(
      'h-screen bg-gray-900 text-white flex flex-col',
      collapsed ? 'w-14' : 'w-56'
    )}>
      
      <div className="px-4 py-3 border-b border-gray-700">
        <Link to="/" className="flex items-center justify-center">
          <img src={logo} alt="UpcycleConnect" className={collapsed ? 'h-8' : 'h-10'} />
        </Link>
      </div>

      
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const tourId = 'tour-nav-' + item.path.replace(/\//g, '-');
            return (
              <li key={item.path}>
                <Link
                  id={tourId}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded text-sm',
                    isActive
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                  title={collapsed ? t(item.label) : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{t(item.label)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      
      <div className="p-2 border-t border-gray-700 space-y-0.5">
        <Link
          to="/profil"
          className={clsx(
            'flex items-center gap-2.5 px-2.5 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 w-full text-sm',
            location.pathname === '/profil' && 'bg-gray-800 text-white'
          )}
          title={collapsed ? t('nav.profile') : undefined}
        >
          <UserCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t('nav.profile')}</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 w-full text-sm"
          title={collapsed ? t('nav.logout') : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
