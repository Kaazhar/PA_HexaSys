import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminSidebar } from '../../config/sidebars';
import { newsletterService } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface NewsletterForm {
  subject: string;
  content: string;
}

export default function AdminNewsletter() {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<NewsletterForm>();

  const onSubmit = async (data: NewsletterForm) => {
    try {
      const res = await newsletterService.send(data.subject, data.content);
      toast.success(t('admin_newsletter.sent_success', { count: res.data?.count ?? 0 }));
      reset();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebar} title={t('admin_newsletter.title')}>
      <div className="max-w-2xl">
        <div className="card">
          <div className="mb-6">
            <h2 className="font-bold text-gray-900">{t('admin_newsletter.heading')}</h2>
            <p className="text-sm text-gray-500">{t('admin_newsletter.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">{t('admin_newsletter.subject')}</label>
              <input
                {...register('subject', { required: true })}
                className="input"
                placeholder={t('admin_newsletter.subject_placeholder')}
              />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
            </div>

            <div>
              <label className="label">{t('admin_newsletter.content')}</label>
              <textarea
                {...register('content', { required: true })}
                className="input min-h-[300px] font-mono text-sm resize-y"
                placeholder={t('admin_newsletter.content_placeholder')}
              />
              {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-700">{t('admin_newsletter.warning')}</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? t('admin_newsletter.sending') : t('admin_newsletter.send_btn')}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
