import {
  LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign,
  FolderOpen, Flag, PlusCircle, Star, MessageCircle, Map,
  Briefcase, Image, FileText, Calendar, Send,
} from 'lucide-react';

export const adminSidebar = [
  { label: 'Dashboard',      path: '/admin',                icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Utilisateurs',   path: '/admin/utilisateurs',   icon: <Users className="w-4 h-4" /> },
  { label: 'Annonces',       path: '/admin/annonces',       icon: <Tag className="w-4 h-4" /> },
  { label: 'Formations',     path: '/admin/formations',     icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Catégories',     path: '/admin/categories',     icon: <FolderOpen className="w-4 h-4" /> },
  { label: 'Conteneurs',     path: '/admin/conteneurs',     icon: <Package className="w-4 h-4" /> },
  { label: 'Finance',        path: '/admin/finance',        icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Signalements',   path: '/admin/signalements',   icon: <Flag className="w-4 h-4" /> },
  { label: 'Newsletter',     path: '/admin/newsletter',     icon: <Send className="w-4 h-4" /> },
];

export const particulierSidebar = [
  { label: 'Dashboard',        path: '/dashboard',         icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Mes annonces',     path: '/mes-annonces',      icon: <Tag className="w-4 h-4" /> },
  { label: 'Créer une annonce',path: '/annonces/creer',    icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'Messages',         path: '/messages',          icon: <MessageCircle className="w-4 h-4" /> },
  { label: 'Formations',       path: '/formations',        icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Conteneurs',       path: '/conteneurs',        icon: <Map className="w-4 h-4" /> },
  { label: 'Mon score',        path: '/score',             icon: <Star className="w-4 h-4" /> },
];

export const proSidebar = [
  { label: 'Dashboard',         path: '/pro',             icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Mes annonces',      path: '/mes-annonces',    icon: <Tag className="w-4 h-4" /> },
  { label: 'Créer une annonce', path: '/annonces/creer',  icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'Projets upcycling', path: '/pro/projets',     icon: <Image className="w-4 h-4" /> },
  { label: 'Messages',          path: '/messages',        icon: <MessageCircle className="w-4 h-4" /> },
  { label: 'Abonnement',        path: '/abonnement',      icon: <Briefcase className="w-4 h-4" /> },
];

export const salarieSidebar = [
  { label: 'Dashboard',    path: '/salarie',              icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Formations',   path: '/salarie/formations',   icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Articles',     path: '/salarie/articles',     icon: <FileText className="w-4 h-4" /> },
  { label: 'Planning',     path: '/salarie/planning',     icon: <Calendar className="w-4 h-4" /> },
];
