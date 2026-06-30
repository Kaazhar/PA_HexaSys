import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { authService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ResetForm {
  password: string;
  confirm: string;
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetForm>();

  const onSubmit = async ({ password }: ResetForm) => {
    if (!token) { toast.error(t('reset_password.invalid_link')); return; }
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      toast.error(t('reset_password.expired'));
    }
  };

  if (!token) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password.invalid_title')}</h1>
            <Link to="/mot-de-passe-oublie" className="btn-primary mt-4 inline-block">{t('reset_password.request_new')}</Link>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('reset_password.success_title')}</h1>
              <p className="text-gray-500">{t('reset_password.success_sub')}</p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('reset_password.title')}</h1>
                <p className="text-gray-500 mt-1">{t('reset_password.subtitle')}</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">{t('reset_password.new_password')}</label>
                  <input
                    {...register('password', { required: true, minLength: { value: 8, message: t('reset_password.min_chars') } })}
                    type="password"
                    className="input"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="label">{t('reset_password.confirm_password')}</label>
                  <input
                    {...register('confirm', { validate: v => v === watch('password') || t('reset_password.mismatch') })}
                    type="password"
                    className="input"
                    placeholder="••••••••"
                  />
                  {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? t('reset_password.submitting') : t('reset_password.submit')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
