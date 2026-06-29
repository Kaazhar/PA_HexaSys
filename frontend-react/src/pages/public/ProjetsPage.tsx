import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Eye, Heart, ChevronRight, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { projectService } from '../../services/api';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import type { Project } from '../../types';
import { useTranslation } from 'react-i18next';

export default function ProjetsPage() {
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectService.getAll(search ? { search } : undefined),
  });

  const projects: Project[] = data?.data ?? [];

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('projects_public.title')}</h1>
          <p className="text-gray-500 mt-1">{t('projects_public.subtitle')}</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input w-full pl-9"
            placeholder={t('projects_public.search_ph')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Hammer className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-600">{t('projects_public.empty')}</p>
            <p className="text-sm mt-1">{t('projects_public.empty_sub')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const tags = project.tags ? project.tags.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <Link
      to={`/projets/${project.id}`}
      className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-[#2D5016]/30 hover:shadow-sm transition-all group flex flex-col gap-3"
    >
      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-[#2D5016] font-medium">{tag}</span>
          ))}
        </div>
      )}

      <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-[#2D5016] transition-colors">
        {project.title}
      </h3>

      {project.description && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{project.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          {project.user && <span className="font-medium text-gray-600">{project.user.firstname} {project.user.lastname}</span>}
          {' · '}{format(new Date(project.created_at), 'dd MMM yyyy', { locale: dateLocale })}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{project.views}</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{project.likes}</span>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2D5016] transition-colors" />
        </div>
      </div>
    </Link>
  );
}
