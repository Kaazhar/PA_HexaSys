import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Leaf, Mail, Lock, User, ArrowRight, Briefcase, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RegisterForm {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'particulier' | 'professionnel';
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    defaultValues: { role: 'particulier' },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstname: data.firstname,
        lastname: data.lastname,
        role: data.role,
      });
      toast.success(t('auth.registerSuccess'));
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  const selectedRole = watch('role');

  return (
    <div className="min-h-screen flex">
      {/* Left - Visual */}
      <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-primary-600 to-primary-500 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Rejoignez la communauté</h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Plus de 12,000 membres qui donnent une seconde vie à leurs objets chaque jour.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {['Publiez vos annonces gratuitement', 'Participez aux ateliers d\'upcycling', 'Suivez votre impact environnemental', 'Gagnez des points et montez de niveau'].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">✓</span>
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-white overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">UpcycleConnect</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.register')}</h1>
          <p className="text-gray-500 mb-8">Créez votre compte en quelques secondes.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="label">Je suis...</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedRole === 'particulier' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input {...register('role')} type="radio" value="particulier" className="sr-only" />
                  <Home className={`w-6 h-6 ${selectedRole === 'particulier' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'particulier' ? 'text-primary-500' : 'text-gray-600'}`}>
                    {t('auth.role.particulier')}
                  </span>
                </label>
                <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedRole === 'professionnel' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input {...register('role')} type="radio" value="professionnel" className="sr-only" />
                  <Briefcase className={`w-6 h-6 ${selectedRole === 'professionnel' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'professionnel' ? 'text-primary-500' : 'text-gray-600'}`}>
                    {t('auth.role.professionnel')}
                  </span>
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('auth.firstname')}</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('firstname', { required: 'Prénom requis' })}
                    className="input pl-9"
                    placeholder="Marie"
                  />
                </div>
                {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>}
              </div>
              <div>
                <label className="label">{t('auth.lastname')}</label>
                <input
                  {...register('lastname', { required: 'Nom requis' })}
                  className="input"
                  placeholder="Dupont"
                />
                {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email', { required: 'Email requis', pattern: { value: /^\S+@\S+$/, message: 'Email invalide' } })}
                  type="email"
                  className="input pl-9"
                  placeholder="marie@exemple.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password', { required: 'Mot de passe requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })}
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('confirmPassword', {
                    required: 'Confirmation requise',
                    validate: (v) => v === password || 'Les mots de passe ne correspondent pas',
                  })}
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base mt-2"
            >
              {isSubmitting ? 'Inscription...' : "Créer mon compte"}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-500 font-medium hover:text-primary-600">
              {t('auth.loginHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
