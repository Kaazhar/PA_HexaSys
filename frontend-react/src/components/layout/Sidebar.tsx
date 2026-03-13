import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className={clsx(
      'h-screen bg-gray-900 text-white flex flex-col',
      collapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo */}
      <div className="px-4 py-3 border-b border-gray-700">
        <Link to="/" className="flex items-center justify-center">
          <img src={logo} alt="UpcycleConnect" className={collapsed ? 'h-8' : 'h-10'} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded text-sm',
                    isActive
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 w-full text-sm"
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
