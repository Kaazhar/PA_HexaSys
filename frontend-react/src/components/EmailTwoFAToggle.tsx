import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { authService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Props {
  isEnabled?: boolean;
  onSuccess: (user: User) => void;
}

export default function EmailTwoFAToggle({ isEnabled, onSuccess }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState(isEnabled ?? false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const next = !active;
      const res = await authService.toggleEmail2FA(next);
      setActive(next);
      toast.success(res.data.message);
      onSuccess(res.data.user);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('email_twofa.update_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        {active ? (
          <ShieldCheck className="w-4 h-4 text-blue-500" />
        ) : (
          <ShieldOff className="w-4 h-4 text-gray-400" />
        )}
        <h2 className="font-semibold text-gray-900">{t('email_twofa.title')}</h2>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {active ? t('email_twofa.enabled') : t('email_twofa.disabled')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {active ? t('email_twofa.active_desc') : t('email_twofa.inactive_desc')}
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-blue-500' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}
