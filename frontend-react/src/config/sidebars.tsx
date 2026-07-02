import {
  LayoutDashboard, Users, Tag, BookOpen, Package, DollarSign,
  FolderOpen, Flag, PlusCircle, Star, MessageCircle, Map,
  Briefcase, Image, FileText, Calendar, Send, MessageSquare, Lightbulb, PackageCheck, Globe, Receipt,
} from 'lucide-react';

// Les `label` sont des clés i18n (namespace `sidebar.*`), traduites au rendu dans Sidebar via t().
export const adminSidebar = [
  { label: 'sidebar.users',        path: '/admin/utilisateurs',   icon: <Users className="w-4 h-4" /> },
  { label: 'sidebar.listings',     path: '/admin/annonces',       icon: <Tag className="w-4 h-4" /> },
  { label: 'sidebar.workshops',    path: '/admin/formations',     icon: <BookOpen className="w-4 h-4" /> },
  { label: 'sidebar.conseils',     path: '/admin/conseils',       icon: <Lightbulb className="w-4 h-4" /> },
  { label: 'sidebar.forum',        path: '/admin/forum',          icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'sidebar.projects',     path: '/admin/projets',        icon: <Image className="w-4 h-4" /> },
  { label: 'sidebar.subscriptions',path: '/admin/abonnements',    icon: <Briefcase className="w-4 h-4" /> },
  { label: 'sidebar.categories',   path: '/admin/categories',     icon: <FolderOpen className="w-4 h-4" /> },
  { label: 'sidebar.containers',   path: '/admin/conteneurs',     icon: <Package className="w-4 h-4" /> },
  { label: 'sidebar.finance',      path: '/admin/finance',        icon: <DollarSign className="w-4 h-4" /> },
  { label: 'sidebar.reports',      path: '/admin/signalements',   icon: <Flag className="w-4 h-4" /> },
  { label: 'sidebar.newsletter',   path: '/admin/newsletter',     icon: <Send className="w-4 h-4" /> },
  { label: 'sidebar.languages',    path: '/admin/langues',        icon: <Globe className="w-4 h-4" /> },
  { label: 'sidebar.overview',     path: '/admin',                icon: <LayoutDashboard className="w-4 h-4" /> },
];

export const particulierSidebar = [
  { label: 'sidebar.dashboard',      path: '/dashboard',         icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'sidebar.my_listings',    path: '/mes-annonces',      icon: <Tag className="w-4 h-4" /> },
  { label: 'sidebar.create_listing', path: '/annonces/creer',    icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'sidebar.my_planning',    path: '/planning',          icon: <Calendar className="w-4 h-4" /> },
  { label: 'sidebar.messages',       path: '/messages',          icon: <MessageCircle className="w-4 h-4" /> },
  { label: 'sidebar.workshops',      path: '/formations',        icon: <BookOpen className="w-4 h-4" /> },
  { label: 'sidebar.containers',     path: '/conteneurs',        icon: <Map className="w-4 h-4" /> },
  { label: 'sidebar.my_deposits',    path: '/mes-depots',        icon: <PackageCheck className="w-4 h-4" /> },
  { label: 'sidebar.my_purchases',   path: '/mes-achats',        icon: <Receipt className="w-4 h-4" /> },
  { label: 'sidebar.my_score',       path: '/score',             icon: <Star className="w-4 h-4" /> },
];

export const proSidebar = [
  { label: 'sidebar.dashboard',          path: '/pro',             icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'sidebar.my_listings',        path: '/mes-annonces',    icon: <Tag className="w-4 h-4" /> },
  { label: 'sidebar.create_listing',     path: '/annonces/creer',  icon: <PlusCircle className="w-4 h-4" /> },
  { label: 'sidebar.projects_upcycling', path: '/pro/projets',     icon: <Image className="w-4 h-4" /> },
  { label: 'sidebar.containers',         path: '/conteneurs',      icon: <Map className="w-4 h-4" /> },
  { label: 'sidebar.messages',           path: '/messages',        icon: <MessageCircle className="w-4 h-4" /> },
  { label: 'sidebar.subscription',       path: '/abonnement',      icon: <Briefcase className="w-4 h-4" /> },
  { label: 'sidebar.my_purchases',       path: '/mes-achats',      icon: <Receipt className="w-4 h-4" /> },
];

export const salarieSidebar = [
  { label: 'sidebar.dashboard',  path: '/salarie',              icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'sidebar.workshops',  path: '/salarie/formations',   icon: <BookOpen className="w-4 h-4" /> },
  { label: 'sidebar.articles',   path: '/salarie/articles',     icon: <FileText className="w-4 h-4" /> },
  { label: 'sidebar.planning',   path: '/salarie/planning',     icon: <Calendar className="w-4 h-4" /> },
  { label: 'sidebar.forum',      path: '/salarie/forum',        icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'sidebar.conseils',   path: '/conseils',             icon: <Lightbulb className="w-4 h-4" /> },
];
