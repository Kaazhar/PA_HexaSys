import { ReactNode } from 'react';
import Navbar from './Navbar';
import { Leaf, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-primary-500 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">UpcycleConnect</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                La plateforme qui connecte les acteurs de l'upcycling pour un avenir plus durable et circulaire.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
                <li><Link to="/annonces" className="hover:text-white transition-colors">Annonces</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">S'inscrire</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> contact@upcycleconnect.fr</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +33 1 23 45 67 89</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Paris, France</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/50">
            © 2026 UpcycleConnect. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
