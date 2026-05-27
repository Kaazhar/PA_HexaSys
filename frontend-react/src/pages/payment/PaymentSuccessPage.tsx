import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

type ConfirmResult = {
  status: string;
  type?: string;
  title?: string;
  plan?: string;
};

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user } = useAuth();
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    api.get<ConfirmResult>(`/stripe/confirm?session_id=${sessionId}`)
      .then(res => setResult(res.data))
      .catch(() => setResult({ status: 'confirmed' }))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'professionnel': return '/pro';
      case 'salarie': return '/salarie';
      default: return '/dashboard';
    }
  };

  const getMessage = () => {
    if (!result) return 'Votre paiement a été confirmé.';
    if (result.type === 'workshop') return `Votre inscription à "${result.title}" est confirmée !`;
    if (result.type === 'subscription') return `Abonnement ${result.plan} activé !`;
    return 'Votre paiement a été confirmé.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {loading ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirmation en cours...</h1>
            <p className="text-gray-400 text-sm">Nous enregistrons votre paiement.</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi !</h1>
            <p className="text-gray-600 mb-6">{getMessage()}</p>

            <div className="space-y-3">
              <Link
                to={getDashboardPath()}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#2D5016] text-white rounded-xl font-medium hover:bg-[#3a6a1e] transition-colors"
              >
                Aller au tableau de bord
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/formations"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Voir les formations
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
