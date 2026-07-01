import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ChevronDown, Search, MessageCircle, Map } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, searchService } from '../../services/api';
import clsx from 'clsx';
import type { Notification } from '../../types';
import { useTranslation } from 'react-i18next';

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] ?? 'fr';

  const { data: languages = [{ code: 'fr', label: 'FR', flag: '🇫🇷' }, { code: 'en', label: 'EN', flag: '🇬🇧' }] } = useQuery({
    queryKey: ['languages'],
    queryFn: () => fetch('/locales/languages.json').then(r => r.json()),
    staleTime: Infinity,
  });
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const notifications: Notification[] = notifData?.data ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const { data: searchData } = useQuery({
    queryKey: ['global-search', debouncedSearch],
    queryFn: () => searchService.global(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
  });

  const searchResults = searchData?.data;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'professionnel': return '/pro';
      case 'salarie': return '/salarie';
      default: return '/dashboard';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/annonces?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const totalResults = (searchResults?.listings?.length ?? 0) + (searchResults?.workshops?.length ?? 0);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src={logo} alt="UpcycleConnect" className="h-8" />
          </Link>

          
          <div className="hidden md:flex items-center gap-5">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.home')}</Link>
            <Link to="/annonces" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.listings')}</Link>
            <Link to="/formations" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.workshops')}</Link>
            <Link to="/conteneurs" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors flex items-center gap-1">
              <Map className="w-3.5 h-3.5" />{t('nav.containers')}
            </Link>
            <Link to="/conseils" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.conseils')}</Link>
            <Link to="/projets" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.projets')}</Link>
            <Link to="/forum" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">{t('nav.forum')}</Link>
          </div>

          
          <div ref={searchRef} className="hidden md:block relative flex-1 max-w-xs">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 transition-colors"
                  placeholder={t('nav.search_placeholder')}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                />
              </div>
            </form>

            {searchOpen && debouncedSearch.length >= 2 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
                {!searchResults ? (
                  <p className="text-sm text-gray-400 px-4 py-2">{t('nav.search_loading')}</p>
                ) : totalResults === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-2">{t('nav.no_results')}</p>
                ) : (
                  <>
                    {(searchResults.listings?.length > 0) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-1.5">{t('nav.listings')}</p>
                        {searchResults.listings.slice(0, 4).map((l: any) => (
                          <Link
                            key={l.id}
                            to={`/annonces/${l.id}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                          >
                            {l.title}
                          </Link>
                        ))}
                      </div>
                    )}
                    {(searchResults.workshops?.length > 0) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-1.5">{t('nav.workshops')}</p>
                        {searchResults.workshops.slice(0, 3).map((w: any) => (
                          <Link
                            key={w.id}
                            to={`/formations/${w.id}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                          >
                            {w.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </Link>

                
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{t('nav.notifications')}</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-sm text-gray-400 px-4 py-4 text-center">{t('nav.no_notifications')}</p>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markReadMutation.mutate(n.id)}
                            className={clsx(
                              'px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors',
                              !n.read && 'bg-primary-50'
                            )}
                          >
                            <p className="text-sm text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden relative">
                      <span className="absolute">{user.firstname.charAt(0)}{user.lastname.charAt(0)}</span>
                      {user.avatar_url && (
                        <img key={user.avatar_url} src={user.avatar_url} alt="avatar" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstname}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-md border border-gray-200 py-1 z-50">
                      <Link
                        to={getDashboardPath()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        to="/profil"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.profile')}
                      </Link>
                      {user?.role === 'professionnel' && (
                        <Link
                          to="/abonnement"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          {t('nav.subscription')}
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2">{t('nav.login')}</Link>
                <Link to="/register" className="btn-primary text-sm py-2">{t('nav.register')}</Link>
              </>
            )}
          </div>

          
          <div className="hidden md:flex items-center gap-1">
            {languages.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  currentLang === lang.code
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                title={lang.label}
              >
                {lang.label}
              </button>
            ))}
          </div>

          
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-3 px-4 space-y-2">
          <Link to="/" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.home')}</Link>
          <Link to="/annonces" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.listings')}</Link>
          <Link to="/formations" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.workshops')}</Link>
          <Link to="/conteneurs" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.containers')}</Link>
          <Link to="/conseils" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.conseils')}</Link>
          <Link to="/projets" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.projets')}</Link>
          <Link to="/forum" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.forum')}</Link>
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
              <Link to="/messages" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.messages')}</Link>
              <Link to="/profil" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.profile')}</Link>
              <button onClick={handleLogout} className="block py-2 text-sm text-red-600">{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
              <Link to="/register" className="block py-2 text-sm text-primary-500 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
