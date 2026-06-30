import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { projectService } from '../../services/api';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => projectService.getOne(Number(id)),
    enabled: !!id,
  });

  const detail = data?.data;

  const followMutation = useMutation({
    mutationFn: () => detail?.is_following ? projectService.unfollow(Number(id)) : projectService.follow(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      toast.success(detail?.is_following ? t('project_detail.unfollowed') : t('project_detail.followed'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const handleFollow = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    followMutation.mutate();
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </PublicLayout>
    );
  }

  if (!detail) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
          <p className="text-lg font-medium">{t('project_detail.not_found')}</p>
          <Link to="/projets" className="text-[#2D5016] underline mt-3 inline-block">{t('project_detail.back')}</Link>
        </div>
      </PublicLayout>
    );
  }

  const { project, updates, followers_count, is_following, forum_topic_id } = detail;
  const tags = project.tags ? project.tags.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/projets" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          {t('project_detail.back')}
        </Link>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{project.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
              {project.user && (
                <span className="font-medium text-gray-700">{project.user.firstname} {project.user.lastname}</span>
              )}
              <span>{followers_count} {t('project_detail.followers')}</span>
            </div>
          </div>
          <button
            onClick={handleFollow}
            disabled={followMutation.isPending}
            className={is_following ? 'btn-secondary flex-shrink-0' : 'btn-primary flex-shrink-0'}
          >
            {is_following ? t('project_detail.unfollow') : t('project_detail.follow')}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-[#2D5016] font-medium">{tag}</span>
            ))}
          </div>
        )}

        {project.description && (
          <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-6">{project.description}</p>
        )}

        {is_following && (
          <Link
            to={`/forum/${forum_topic_id}`}
            className="text-sm text-[#2D5016] bg-green-50 rounded-lg px-4 py-3 mb-8 hover:bg-green-100 transition-colors inline-block"
          >
            {t('project_detail.community_space')}
          </Link>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('project_detail.timeline')}</h2>

        {updates.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">{t('project_detail.no_updates')}</p>
        ) : (
          <div className="space-y-6">
            {updates.map(u => (
              <div key={u.id} className="border-l-2 border-[#2D5016]/20 pl-4">
                <p className="text-xs text-gray-400 mb-2">{format(new Date(u.created_at), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}</p>
                {u.image_url && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {u.image_url.split(',').map(s => s.trim()).filter(Boolean).map((src, i) => (
                      <img key={i} src={src} alt="" className="rounded-xl max-h-96 w-auto object-cover" />
                    ))}
                  </div>
                )}
                {u.comment && <p className="text-gray-700 whitespace-pre-line">{u.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
