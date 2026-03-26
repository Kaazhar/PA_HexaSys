import { Send, Mail } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import { newsletterService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface NewsletterForm {
  subject: string;
  content: string;
}

export default function AdminNewsletter() {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<NewsletterForm>();

  const onSubmit = async (data: NewsletterForm) => {
    try {
      const res = await newsletterService.send(data.subject, data.content);
      toast.success(`Newsletter envoyée à ${res.data?.count ?? 0} abonné(s)`);
      reset();
    } catch {
      toast.error("Erreur lors de l'envoi de la newsletter");
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title="Newsletter">
      <div className="max-w-2xl">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Envoyer une newsletter</h2>
              <p className="text-sm text-gray-500">Envoyez un email à tous les abonnés à la newsletter.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Sujet *</label>
              <input
                {...register('subject', { required: 'Sujet requis' })}
                className="input"
                placeholder="Ex: Nouveautés de la plateforme - Mars 2026"
              />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
            </div>

            <div>
              <label className="label">Contenu (HTML) *</label>
              <textarea
                {...register('content', { required: 'Contenu requis' })}
                className="input min-h-[300px] font-mono text-sm resize-y"
                placeholder="<h1>Bonjour !</h1><p>Voici les dernières nouvelles...</p>"
              />
              {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-700">
                ⚠️ Cet email sera envoyé à tous les utilisateurs ayant activé la newsletter. Cette action est irréversible.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer la newsletter'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
