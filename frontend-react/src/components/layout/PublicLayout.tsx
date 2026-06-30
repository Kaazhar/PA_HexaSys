import { ReactNode } from 'react';
import Navbar from './Navbar';
import { Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useTranslation } from 'react-i18next';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-primary-500 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="mb-4">
                <img src={logo} alt="UpcycleConnect" className="h-10" />
              </div>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('footer.nav')}</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link></li>
                <li><Link to="/annonces" className="hover:text-white transition-colors">{t('nav.listings')}</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">{t('nav.register')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('footer.contact')}</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> upcycleconnectnewletter@gmail.com</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Marseille, France</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/50">
            {t('footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
}
