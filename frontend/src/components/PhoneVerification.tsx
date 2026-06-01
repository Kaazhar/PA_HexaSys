import { useState } from 'react';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import { phoneService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';

interface Props {
  currentPhone?: string;
  isVerified?: boolean;
  onSuccess: (user: User) => void;
}

export default function PhoneVerification({ currentPhone, isVerified, onSuccess }: Props) {
  const [etape, setEtape] = useState<'saisie_numero' | 'saisie_code'>('saisie_numero');
  const [telephone, setTelephone] = useState(currentPhone || '');
  const [code, setCode] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  const envoyerCode = async () => {
    if (!telephone.trim()) {
      toast.error('Saisissez votre numéro de téléphone');
      return;
    }
    setEnChargement(true);
    try {
      await phoneService.sendCode(telephone);
      toast.success('Code envoyé par SMS !');
      setEtape('saisie_code');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi du SMS');
    } finally {
      setEnChargement(false);
    }
  };

  const verifierCode = async () => {
    if (code.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }
    setEnChargement(true);
    try {
      const res = await phoneService.verify(telephone, code);
      toast.success('Téléphone vérifié !');
      onSuccess(res.data.user);
      setCode('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Code incorrect');
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Phone className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Vérification du téléphone</h2>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded ml-auto">
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
      </div>

      {etape === 'saisie_numero' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Vérifiez votre numéro pour activer la 2FA et obtenir le badge "téléphone vérifié".
          </p>
          <div>
            <label className="label">Numéro de téléphone</label>
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
              Envoyer le code
            </button>
          </div>
        </div>
      )}

      {etape === 'saisie_code' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Un code à 6 chiffres a été envoyé au <strong>{telephone}</strong>. Il est valable 10 minutes.
          </p>
          <div>
            <label className="label">Code reçu par SMS</label>
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
              Changer de numéro
            </button>
            <div className="flex gap-2">
              <button
                onClick={envoyerCode}
                disabled={enChargement}
                className="btn-secondary text-sm"
              >
                Renvoyer
              </button>
              <button
                onClick={verifierCode}
                disabled={enChargement || code.length !== 6}
                className="btn-primary flex items-center gap-2"
              >
                {enChargement && <Loader2 className="w-4 h-4 animate-spin" />}
                Vérifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
