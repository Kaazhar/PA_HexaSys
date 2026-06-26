import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { phoneService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Props {
  isEnabled?: boolean;
  isPhoneVerified?: boolean;
  onSuccess: (user: User) => void;
}

export default function TwoFAToggle({ isEnabled, isPhoneVerified, onSuccess }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState(isEnabled ?? false);
  const [enChargement, setEnChargement] = useState(false);

  const basculer = async () => {
    if (!isPhoneVerified && !active) {
      toast.error(t('twofa.phone_required_error'));
      return;
    }

    setEnChargement(true);
    try {
      const nouvelleValeur = !active;
      const res = await phoneService.toggle2FA(nouvelleValeur);
      setActive(nouvelleValeur);
      toast.success(res.data.message);
      onSuccess(res.data.user);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('twofa.update_error'));
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        {active ? (
          <ShieldCheck className="w-4 h-4 text-green-500" />
        ) : (
          <ShieldOff className="w-4 h-4 text-gray-400" />
        )}
        <h2 className="font-semibold text-gray-900">{t('twofa.title')}</h2>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {active ? t('twofa.enabled') : t('twofa.disabled')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {!isPhoneVerified
              ? t('twofa.phone_required_desc')
              : active
                ? t('twofa.sms_active_desc')
                : t('twofa.sms_inactive_desc')}
          </p>
        </div>

        <button
          type="button"
          onClick={basculer}
          disabled={enChargement || (!isPhoneVerified && !active)}
          title={!isPhoneVerified ? t('twofa.phone_required_tooltip') : ''}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${active ? 'bg-green-500' : 'bg-gray-200'}
            ${(!isPhoneVerified && !active) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${active ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  );
}
