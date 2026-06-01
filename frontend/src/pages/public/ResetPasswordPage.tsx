import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { authService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface ResetForm {
  password: string;
  confirm: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetForm>();

  const onSubmit = async ({ password }: ResetForm) => {
    if (!token) { toast.error('Lien invalide'); return; }
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      toast.error('Lien invalide ou expiré.');
    }
  };

  if (!token) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
            <Link to="/mot-de-passe-oublie" className="btn-primary mt-4 inline-block">Demander un nouveau lien</Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-auto px-4">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe mis à jour !</h1>
              <p className="text-gray-500">Vous allez être redirigé vers la page de connexion...</p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
                <p className="text-gray-500 mt-1">Choisissez un nouveau mot de passe sécurisé.</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <input
                    {...register('password', { required: true, minLength: { value: 8, message: 'Minimum 8 caractères' } })}
                    type="password"
                    className="input"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="label">Confirmer le mot de passe</label>
                  <input
                    {...register('confirm', { validate: v => v === watch('password') || 'Les mots de passe ne correspondent pas' })}
                    type="password"
                    className="input"
                    placeholder="••••••••"
                  />
                  {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
