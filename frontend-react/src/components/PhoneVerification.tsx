import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { phoneService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Props {
  currentPhone?: string;
  isVerified?: boolean;
  onSuccess: (user: User) => void;
}

export default function PhoneVerification({ currentPhone, isVerified, onSuccess }: Props) {
  const { t } = useTranslation();
  const [etape, setEtape] = useState<'saisie_numero' | 'saisie_code'>('saisie_numero');
  const [telephone, setTelephone] = useState(currentPhone || '');
  const [code, setCode] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  const envoyerCode = async () => {
    if (!telephone.trim()) {
      toast.error(t('phone.required_error'));
      return;
    }
    setEnChargement(true);
    try {
      await phoneService.sendCode(telephone);
      toast.success(t('phone.code_sent_success'));
      setEtape('saisie_code');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('phone.send_error'));
    } finally {
      setEnChargement(false);
    }
  };

  const verifierCode = async () => {
    if (code.length !== 6) {
      toast.error(t('phone.code_length_error'));
      return;
    }
    setEnChargement(true);
    try {
      const res = await phoneService.verify(telephone, code);
      toast.success(t('phone.verified_success'));
      onSuccess(res.data.user);
      setCode('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || t('phone.code_error'));
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <h2 className="font-semibold text-gray-900">{t('phone.title')}</h2>
        {isVerified && (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded ml-auto">
            {t('phone.verified_badge')}
          </span>
        )}
      </div>

      {etape === 'saisie_numero' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('phone.description')}</p>
          <div>
            <label className="label">{t('phone.phone_label')}</label>
            <input
              type="tel"
              className="input"
              placeholder="+33 6 12 34 56 78"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={envoyerCode}
              disabled={enChargement}
              className="btn-primary flex items-center gap-2"
            >
              {enChargement && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('phone.send_btn')}
            </button>
          </div>
        </div>
      )}

      {etape === 'saisie_code' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t('phone.code_sent_prefix')} <strong>{telephone}</strong>. {t('phone.code_sent_suffix')}
          </p>
          <div>
            <label className="label">{t('phone.code_label')}</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input tracking-widest text-center text-lg font-mono"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setEtape('saisie_numero'); setCode(''); }}
              className="text-sm text-gray-500 hover:underline"
            >
              {t('phone.change_number')}
            </button>
            <div className="flex gap-2">
              <button
                onClick={envoyerCode}
                disabled={enChargement}
                className="btn-secondary text-sm"
              >
                {t('phone.resend_btn')}
              </button>
              <button
                onClick={verifierCode}
                disabled={enChargement || code.length !== 6}
                className="btn-primary flex items-center gap-2"
              >
                {enChargement && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('phone.verify_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
