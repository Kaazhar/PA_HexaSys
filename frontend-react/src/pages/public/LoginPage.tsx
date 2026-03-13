import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Connexion réussie');
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
      toast.error(error.response?.data?.error || 'Identifiants invalides');
    }
  };

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
