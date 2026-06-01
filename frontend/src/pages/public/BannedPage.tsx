import { Link, useSearchParams } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function BannedPage() {
  const [params] = useSearchParams();
  const reason = params.get('reason') || 'Violation des conditions d\'utilisation';
  const expiresAt = params.get('expires_at');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte suspendu</h1>
        <p className="text-gray-500 mb-5">
          Votre compte a été suspendu et vous ne pouvez plus accéder à la plateforme.
        </p>
        <div className="bg-red-50 rounded-xl p-4 text-left mb-6">
          <p className="text-sm text-red-700">
            <span className="font-semibold">Motif :</span> {reason}
          </p>
          {expiresAt && (
            <p className="text-sm text-red-700 mt-1">
              <span className="font-semibold">Suspension jusqu'au :</span>{' '}
              {new Date(expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          {!expiresAt && (
            <p className="text-sm text-red-700 mt-1">
              <span className="font-semibold">Durée :</span> Définitive
            </p>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Si vous pensez qu'il s'agit d'une erreur, contactez le support à{' '}
          <a href="mailto:upcycleconnectnewletter@gmail.com" className="text-primary-500 hover:underline">
            upcycleconnectnewletter@gmail.com
          </a>
        </p>
        <Link to="/" className="btn-secondary w-full flex items-center justify-center">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
