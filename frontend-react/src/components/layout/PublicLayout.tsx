import { ReactNode } from 'react';
import Navbar from './Navbar';
import logo from '../../assets/logo.png';
import { useTranslation } from 'react-i18next';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-primary-500 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center gap-4">
          <img src={logo} alt="UpcycleConnect" className="h-12" />
          <p className="text-white/70 text-sm text-center">{t('footer.tagline')}</p>
          <div className="text-center text-sm text-white/60">
            <p>upcycleconnectnewletter@gmail.com · Paris, France</p>
          </div>
          <div className="border-t border-white/20 w-full pt-6 text-center text-xs text-white/40">
            {t('footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
}
