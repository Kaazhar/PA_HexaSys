import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import type { User } from '../../types';

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession, user } = useAuth();
  const email = searchParams.get('email') || user?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Le code doit contenir 6 chiffres'); return; }
    setLoading(true);
    try {
      const res = await authService.confirmEmail(email, code);
      const { token, user } = res.data as { token: string; user: User };
      setSession(token, user);
      setSuccess(true);
      const dashboardMap: Record<string, string> = { admin: '/admin', professionnel: '/pro', salarie: '/salarie', particulier: '/dashboard' };
      setTimeout(() => navigate(dashboardMap[user?.role || ''] || '/dashboard'), 1500);
    } catch {
      toast.error('Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email confirmé !</h1>
            <p className="text-gray-500">Redirection en cours...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="card text-center">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez votre email</h1>
            <p className="text-gray-500 mb-1">Un code à 6 chiffres a été envoyé à</p>
            <p className="font-semibold text-gray-800 mb-6">{email}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="input text-center text-3xl font-bold tracking-[0.5em] py-4"
                placeholder="000000"
                autoFocus
              />
              <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
                {loading ? 'Vérification...' : 'Confirmer mon compte'}
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-4">
              Pas reçu ? Vérifiez vos spams.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
