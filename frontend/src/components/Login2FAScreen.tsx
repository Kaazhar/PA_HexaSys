import { useState, useRef, KeyboardEvent } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { authService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';

interface Props {
  userId: number;
  onSuccess: (token: string, user: User) => void;
  onCancel: () => void;
}

export default function Login2FAScreen({ userId, onSuccess, onCancel }: Props) {
  const [chiffres, setChiffres] = useState<string[]>(['', '', '', '', '', '']);
  const [enChargement, setEnChargement] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, valeur: string) => {
    const chiffre = valeur.replace(/\D/g, '').slice(-1);

    const nouveauxChiffres = [...chiffres];
    nouveauxChiffres[index] = chiffre;
    setChiffres(nouveauxChiffres);

    if (chiffre && index < 5) {
      refs.current[index + 1]?.focus();
    }

    const codeComplet = nouveauxChiffres.join('');
    if (codeComplet.length === 6) {
      soumettre(codeComplet);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chiffres[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const soumettre = async (code: string) => {
    setEnChargement(true);
    try {
      const res = await authService.verify2FA(userId, code);
      const { token, user } = res.data;
      toast.success('Connexion réussie !');
      onSuccess(token, user);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Code incorrect');
      setChiffres(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setEnChargement(false);
    }
  };

  const renvoyerCode = async () => {
    try {
      await authService.resend2FA(userId);
      toast.success('Nouveau code envoyé par SMS');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 p-8">

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Vérification 2FA</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Saisissez le code à 6 chiffres envoyé par SMS
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {chiffres.map((chiffre, index) => (
            <input
              key={index}
              ref={el => { refs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={chiffre}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onFocus={e => e.target.select()}
              autoFocus={index === 0}
              className="w-11 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg
                focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          ))}
        </div>

        {enChargement && (
          <div className="flex justify-center mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <button
            onClick={onCancel}
            className="text-gray-500 hover:underline"
          >
            ← Retour
          </button>
          <button
            onClick={renvoyerCode}
            className="text-primary-500 hover:underline"
          >
            Renvoyer le code
          </button>
        </div>
      </div>
    </div>
  );
}
