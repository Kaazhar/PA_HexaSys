import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Leaf, Mail, Lock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success(t('auth.loginSuccess'));
      // Redirect based on role is handled in App.tsx
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const dashboardMap: Record<string, string> = {
        admin: '/admin',
        professionnel: '/pro',
        salarie: '/salarie',
        particulier: '/dashboard',
      };
      navigate(dashboardMap[user.role] || '/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('auth.loginError'));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-white">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">UpcycleConnect</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.login')}</h1>
          <p className="text-gray-500 mb-8">Bienvenue ! Connectez-vous à votre compte.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email', { required: 'Email requis', pattern: { value: /^\S+@\S+$/, message: 'Email invalide' } })}
                  type="email"
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...register('rememberMe')} type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-500" />
                <span className="text-sm text-gray-600">{t('auth.rememberMe')}</span>
              </label>
              <a href="#" className="text-sm text-primary-500 hover:text-primary-600">
                {t('auth.forgotPassword')}
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              {isSubmitting ? 'Connexion...' : t('auth.login')}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-500 font-medium hover:text-primary-600">
              {t('auth.registerHere')}
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-8 p-4 bg-beige-50 rounded-xl border border-beige-200">
            <p className="text-xs font-semibold text-gray-600 mb-3">Comptes de démonstration :</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between"><span>Admin</span><span className="font-mono">admin@upcycleconnect.fr / admin123</span></div>
              <div className="flex justify-between"><span>Particulier</span><span className="font-mono">particulier@test.fr / test123</span></div>
              <div className="flex justify-between"><span>Pro</span><span className="font-mono">pro@test.fr / test123</span></div>
              <div className="flex justify-between"><span>Salarié</span><span className="font-mono">salarie@test.fr / test123</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary-500 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative text-center max-w-sm">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <blockquote className="text-white text-xl font-medium leading-relaxed mb-6">
            "Chaque objet que vous donnez une seconde vie évite des kg de CO₂ dans l'atmosphère."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">UC</div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">UpcycleConnect</p>
              <p className="text-white/60 text-xs">Économie circulaire</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
