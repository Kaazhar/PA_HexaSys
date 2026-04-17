import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Login2FAScreen from '../../components/Login2FAScreen';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import type { User } from '../../types';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  token?: string;
  user?: User;
  requires_2fa?: boolean;
  user_id?: number;
}

export default function LoginPage() {
  const { login, setSession } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const [userId2FA, setUserId2FA] = useState<number | null>(null);

  const redirectApresLogin = (user: User) => {
    const dashboardMap: Record<string, string> = {
      admin: '/admin',
      professionnel: '/pro',
      salarie: '/salarie',
      particulier: '/dashboard',
    };
    navigate(dashboardMap[user.role] || '/dashboard');
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const { authService } = await import('../../services/api');
      const res = await authService.login(data.email, data.password);
      const reponse = res.data as LoginResponse;

      if (reponse.requires_2fa && reponse.user_id) {
        setUserId2FA(reponse.user_id);
        return;
      }

      if (reponse.token && reponse.user) {
        setSession(reponse.token, reponse.user);
        toast.success('Connexion réussie');
        redirectApresLogin(reponse.user);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Identifiants invalides');
    }
  };

  const apresValidation2FA = (token: string, user: User) => {
    setSession(token, user);
    redirectApresLogin(user);
  };

  if (userId2FA !== null) {
    return (
      <Login2FAScreen
        userId={userId2FA}
        onSuccess={apresValidation2FA}
        onCancel={() => setUserId2FA(null)}
      />
    );
  }

  void login;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-gray-200 rounded-lg overflow-hidden">
        <Link to="/" className="bg-gray-900 flex items-center justify-center py-5">
          <img src={logo} alt="UpcycleConnect" className="h-12" />
        </Link>

        <div className="bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">Connectez-vous à votre compte.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              {...register('email', { required: 'Email requis', pattern: { value: /^\S+@\S+$/, message: 'Email invalide' } })}
              type="email"
              className="input"
              placeholder="vous@exemple.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <input
              {...register('password', { required: 'Mot de passe requis' })}
              type="password"
              className="input"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="text-right">
            <Link to="/mot-de-passe-oublie" className="text-sm text-primary-500 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Connexion...' : 'Connexion'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary-500 font-medium hover:underline">
            S'inscrire
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
