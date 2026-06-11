import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import TutorialOverlay from './components/TutorialOverlay';
import { authService } from './services/api';

import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ListingsPage from './pages/public/ListingsPage';
import ListingDetailPage from './pages/public/ListingDetailPage';
import ContainersPage from './pages/public/ContainersPage';
import WorkshopsPage from './pages/public/WorkshopsPage';
import WorkshopDetailPage from './pages/public/WorkshopDetailPage';
import PublicProfilePage from './pages/public/PublicProfilePage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import ConfirmEmailPage from './pages/public/ConfirmEmailPage';
import NotFoundPage from './pages/public/NotFoundPage';
import BannedPage from './pages/public/BannedPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminListings from './pages/admin/AdminListings';
import AdminWorkshops from './pages/admin/AdminWorkshops';
import AdminContainers from './pages/admin/AdminContainers';
import AdminFinance from './pages/admin/AdminFinance';
import AdminCategories from './pages/admin/AdminCategories';
import AdminReports from './pages/admin/AdminReports';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import AdminLanguages from './pages/admin/AdminLanguages';

import DashboardParticulier from './pages/particulier/DashboardParticulier';
import CreateListingPage from './pages/particulier/CreateListingPage';
import MesAnnoncesPage from './pages/particulier/MesAnnoncesPage';
import EditListingPage from './pages/particulier/EditListingPage';
import ScorePage from './pages/particulier/ScorePage';
import ContainerRequestPage from './pages/particulier/ContainerRequestPage';
import MesDepotsPage from './pages/particulier/MesDepotsPage';
import AbonnementPage from './pages/particulier/AbonnementPage';
import MonPlanningPage from './pages/particulier/MonPlanningPage';

import DashboardPro from './pages/professionnel/DashboardPro';
import ProjetsPro from './pages/professionnel/ProjetsPro';

import DashboardSalarie from './pages/salarie/DashboardSalarie';
import SalarieArticles from './pages/salarie/SalarieArticles';
import SalariePlanning from './pages/salarie/SalariePlanning';
import SalarieFormations from './pages/salarie/SalarieFormations';
import SalarieForum from './pages/salarie/SalarieForum';
import ForumPage from './pages/public/ForumPage';
import ForumTopicPage from './pages/public/ForumTopicPage';
import ConseilsPage from './pages/public/ConseilsPage';
import ConseilDetailPage from './pages/public/ConseilDetailPage';

import MessagesPage from './pages/messages/MessagesPage';
import ProfilePage from './pages/profil/ProfilePage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentCancelPage from './pages/payment/PaymentCancelPage';

function App() {
  const { isLoading, user, updateUser, token } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();

  // Refetch user à chaque changement de page pour détecter ban/désactivation
  useEffect(() => {
    if (!token) return;
    authService.me().then(res => updateUser(res.data)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const key = `tutorial_done_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowTutorial(true);
    }
  }, [user?.id]);

  const handleCloseTutorial = () => {
    if (user) localStorage.setItem(`tutorial_done_${user.id}`, 'true');
    setShowTutorial(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'professionnel': return '/pro';
      case 'salarie': return '/salarie';
      default: return '/dashboard';
    }
  };

  return (
    <>
      {showTutorial && user && (
        <TutorialOverlay role={user.role} onClose={handleCloseTutorial} />
      )}
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/annonces" element={<ListingsPage />} />
      <Route path="/annonces/:id" element={<ListingDetailPage />} />
      <Route path="/conteneurs" element={<ContainersPage />} />
      <Route path="/formations" element={<WorkshopsPage />} />
      <Route path="/formations/:id" element={<WorkshopDetailPage />} />
      <Route path="/utilisateurs/:id" element={<PublicProfilePage />} />
      <Route path="/confirmer-email" element={<ConfirmEmailPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="/login" element={user ? <Navigate to={getDashboardPath()} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={getDashboardPath()} /> : <RegisterPage />} />

      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/annonces" element={<ProtectedRoute roles={['admin']}><AdminListings /></ProtectedRoute>} />
      <Route path="/admin/formations" element={<ProtectedRoute roles={['admin']}><AdminWorkshops /></ProtectedRoute>} />
      <Route path="/admin/conteneurs" element={<ProtectedRoute roles={['admin']}><AdminContainers /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><AdminFinance /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
      <Route path="/admin/signalements" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/newsletter" element={<ProtectedRoute roles={['admin']}><AdminNewsletter /></ProtectedRoute>} />
      <Route path="/admin/langues" element={<ProtectedRoute roles={['admin']}><AdminLanguages /></ProtectedRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute roles={['particulier']}><DashboardParticulier /></ProtectedRoute>} />
      <Route path="/annonces/creer" element={<ProtectedRoute roles={['particulier', 'professionnel']}><CreateListingPage /></ProtectedRoute>} />
      <Route path="/mes-annonces" element={<ProtectedRoute roles={['particulier', 'professionnel']}><MesAnnoncesPage /></ProtectedRoute>} />
      <Route path="/mes-annonces/:id/modifier" element={<ProtectedRoute roles={['particulier', 'professionnel']}><EditListingPage /></ProtectedRoute>} />
      <Route path="/score" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie']}><ScorePage /></ProtectedRoute>} />
      <Route path="/conteneurs/demande" element={<ProtectedRoute roles={['particulier']}><ContainerRequestPage /></ProtectedRoute>} />
      <Route path="/mes-depots" element={<ProtectedRoute roles={['particulier']}><MesDepotsPage /></ProtectedRoute>} />
      <Route path="/abonnement" element={<ProtectedRoute roles={['professionnel']}><AbonnementPage /></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute roles={['particulier']}><MonPlanningPage /></ProtectedRoute>} />

      <Route path="/pro" element={<ProtectedRoute roles={['professionnel']}><DashboardPro /></ProtectedRoute>} />
      <Route path="/pro/projets" element={<ProtectedRoute roles={['professionnel']}><ProjetsPro /></ProtectedRoute>} />

      <Route path="/salarie" element={<ProtectedRoute roles={['salarie']}><DashboardSalarie /></ProtectedRoute>} />
      <Route path="/salarie/articles" element={<ProtectedRoute roles={['salarie']}><SalarieArticles /></ProtectedRoute>} />
      <Route path="/salarie/planning" element={<ProtectedRoute roles={['salarie']}><SalariePlanning /></ProtectedRoute>} />
      <Route path="/salarie/formations" element={<ProtectedRoute roles={['salarie']}><SalarieFormations /></ProtectedRoute>} />
      <Route path="/salarie/forum" element={<ProtectedRoute roles={['salarie', 'admin']}><SalarieForum /></ProtectedRoute>} />

      <Route path="/forum" element={<ForumPage />} />
      <Route path="/forum/:id" element={<ForumTopicPage />} />
      <Route path="/conseils" element={<ConseilsPage />} />
      <Route path="/conseils/:id" element={<ConseilDetailPage />} />

      <Route path="/messages" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie', 'admin']}><MessagesPage /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie', 'admin']}><ProfilePage /></ProtectedRoute>} />

      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/cancel" element={<PaymentCancelPage />} />

      <Route path="/compte-bloque" element={<BannedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
}

export default App;
