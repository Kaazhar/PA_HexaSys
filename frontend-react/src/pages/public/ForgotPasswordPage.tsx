import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout';
import { authService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Une erreur est survenue, veuillez réessayer.');
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-auto px-4">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h1>
              <p className="text-gray-500 mb-6">
                Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
              </p>
              <Link to="/login" className="btn-primary">Retour à la connexion</Link>
            </div>
          ) : (
            <div className="card">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié ?</h1>
                <p className="text-gray-500 mt-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Adresse email</label>
                  <input
                    {...register('email', { required: true })}
                    type="email"
                    className="input"
                    placeholder="votre@email.com"
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
