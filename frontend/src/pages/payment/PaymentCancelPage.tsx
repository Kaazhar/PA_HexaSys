import { XCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement annulé</h1>
        <p className="text-gray-500 mb-6">
          Votre paiement n'a pas été effectué. Aucun montant n'a été débité.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#2D5016] text-white rounded-xl font-medium hover:bg-[#3a6a1e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <Link
            to="/formations"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            Voir les formations
          </Link>
        </div>
      </div>
    </div>
  );
}
