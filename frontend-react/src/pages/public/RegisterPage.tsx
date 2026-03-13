import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Briefcase, Home } from 'lucide-react';
import logo from '../../assets/logo.png';

interface RegisterForm {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'particulier' | 'professionnel';
}

export default function RegisterPage() {
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
      toast.success('Inscription réussie');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Une erreur est survenue');
    }
  };

  const selectedRole = watch('role');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-gray-200 rounded-lg overflow-hidden">
        <Link to="/" className="bg-gray-900 flex items-center justify-center py-5">
          <img src={logo} alt="UpcycleConnect" className="h-12" />
        </Link>

        <div className="bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Inscription</h1>
          <p className="text-sm text-gray-500 mb-6">Créez votre compte.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Je suis...</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-3 border cursor-pointer rounded ${selectedRole === 'particulier' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input {...register('role')} type="radio" value="particulier" className="sr-only" />
                  <Home className={`w-4 h-4 ${selectedRole === 'particulier' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'particulier' ? 'text-primary-500' : 'text-gray-600'}`}>
                    Particulier
                  </span>
                </label>
                <label className={`flex items-center gap-2 p-3 border cursor-pointer rounded ${selectedRole === 'professionnel' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input {...register('role')} type="radio" value="professionnel" className="sr-only" />
                  <Briefcase className={`w-4 h-4 ${selectedRole === 'professionnel' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'professionnel' ? 'text-primary-500' : 'text-gray-600'}`}>
                    Professionnel
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input
                  {...register('firstname', { required: 'Requis' })}
                  className="input"
                  placeholder="Marie"
                />
                {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>}
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  {...register('lastname', { required: 'Requis' })}
                  className="input"
                  placeholder="Dupont"
                />
                {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email requis', pattern: { value: /^\S+@\S+$/, message: 'Email invalide' } })}
                type="email"
                className="input"
                placeholder="marie@exemple.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input
                {...register('password', { required: 'Requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                {...register('confirmPassword', {
                  required: 'Requis',
                  validate: (v) => v === password || 'Les mots de passe ne correspondent pas',
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Inscription...' : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-500 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
