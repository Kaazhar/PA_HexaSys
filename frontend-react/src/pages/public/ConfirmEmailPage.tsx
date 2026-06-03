import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import logo from '../../assets/logo.png';
import { useTranslation } from 'react-i18next';

export default function ConfirmEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession, user } = useAuth();
  const email = searchParams.get('email') || user?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error(t('confirm_email.code_error')); return; }
    setLoading(true);
    try {
      const res = await authService.confirmEmail(email, code);
      const { token, user: confirmedUser } = res.data as { token: string; user: User };
      setSession(token, confirmedUser);
      setSuccess(true);
      const dashboardMap: Record<string, string> = { admin: '/admin', professionnel: '/pro', salarie: '/salarie', particulier: '/dashboard' };
      setTimeout(() => navigate(dashboardMap[confirmedUser?.role || ''] || '/dashboard'), 1500);
    } catch {
      toast.error(t('confirm_email.confirm_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { toast.error(t('confirm_email.email_error')); return; }
    setResending(true);
    try {
      await authService.resendConfirmEmail(email);
      toast.success(t('confirm_email.resend_success'));
    } catch {
      toast.error(t('confirm_email.resend_error'));
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('confirm_email.success_title')}</h1>
          <p className="text-gray-500">{t('confirm_email.redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-beige-50 px-4">
      <img src={logo} alt="UpcycleConnect" className="h-12 mb-8" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('confirm_email.title')}</h1>
        <p className="text-gray-500 mb-1">{t('confirm_email.subtitle')}</p>
        <p className="font-semibold text-gray-800 mb-6">{email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="input text-center text-3xl font-bold tracking-[0.5em] py-4 w-full"
            placeholder="000000"
            autoFocus
          />
          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
            {loading ? t('confirm_email.verifying') : t('confirm_email.verify_btn')}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-4 text-sm text-primary-600 hover:underline disabled:opacity-50"
        >
          {resending ? t('confirm_email.resending') : t('confirm_email.resend')}
        </button>
      </div>
    </div>
  );
}
