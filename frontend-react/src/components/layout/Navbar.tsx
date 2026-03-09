import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Menu, X, Bell, ChevronDown, Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">UpcycleConnect</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/annonces" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">
              {t('nav.listings')}
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-50"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase text-xs font-medium">{i18n.language === 'fr' ? 'EN' : 'FR'}</span>
            </button>

            {isAuthenticated && user ? (
              <>
                <button className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.firstname.charAt(0)}{user.lastname.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstname}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        to={getDashboardPath()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.dashboard')}
                      </Link>
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
                <Link to="/login" className="btn-secondary text-sm py-2">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-3 px-4 space-y-2">
          <Link to="/" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
            {t('nav.home')}
          </Link>
          <Link to="/annonces" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
            {t('nav.listings')}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
                {t('nav.dashboard')}
              </Link>
              <button onClick={handleLogout} className="block py-2 text-sm text-red-600">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="block py-2 text-sm text-primary-500 font-medium" onClick={() => setMobileOpen(false)}>
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
