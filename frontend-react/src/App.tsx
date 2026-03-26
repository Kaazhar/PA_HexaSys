import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ListingsPage from './pages/public/ListingsPage';
import ListingDetailPage from './pages/public/ListingDetailPage';
import WorkshopsPage from './pages/public/WorkshopsPage';
import WorkshopDetailPage from './pages/public/WorkshopDetailPage';
import ContainersMapPage from './pages/public/ContainersMapPage';
import PublicProfilePage from './pages/public/PublicProfilePage';
import ProfilePage from './pages/profil/ProfilePage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminListings from './pages/admin/AdminListings';
import AdminWorkshops from './pages/admin/AdminWorkshops';
import AdminContainers from './pages/admin/AdminContainers';
import AdminFinance from './pages/admin/AdminFinance';
import AdminCategories from './pages/admin/AdminCategories';
import AdminReports from './pages/admin/AdminReports';

import DashboardParticulier from './pages/particulier/DashboardParticulier';
import CreateListingPage from './pages/particulier/CreateListingPage';
import ScorePage from './pages/particulier/ScorePage';
import ContainerRequestPage from './pages/particulier/ContainerRequestPage';
import MesAnnoncesPage from './pages/particulier/MesAnnoncesPage';
import AbonnementPage from './pages/particulier/AbonnementPage';

import DashboardPro from './pages/professionnel/DashboardPro';
import ProjetsPro from './pages/professionnel/ProjetsPro';

import DashboardSalarie from './pages/salarie/DashboardSalarie';
import SalarieFormations from './pages/salarie/SalarieFormations';
import SalarieArticles from './pages/salarie/SalarieArticles';
import SalariePlanning from './pages/salarie/SalariePlanning';

import MessagesPage from './pages/messages/MessagesPage';
import NotFoundPage from './pages/public/NotFoundPage';
import EditListingPage from './pages/particulier/EditListingPage';
import ConfirmEmailPage from './pages/public/ConfirmEmailPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import AdminNewsletter from './pages/admin/AdminNewsletter';

function App() {
  const { isLoading, user } = useAuth();

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
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/annonces" element={<ListingsPage />} />
      <Route path="/annonces/:id" element={<ListingDetailPage />} />
      <Route path="/formations" element={<WorkshopsPage />} />
      <Route path="/formations/:id" element={<WorkshopDetailPage />} />
      <Route path="/conteneurs" element={<ContainersMapPage />} />
      <Route path="/utilisateurs/:id" element={<PublicProfilePage />} />
      <Route path="/profil" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie', 'admin']}><ProfilePage /></ProtectedRoute>} />
      <Route path="/abonnement" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie', 'admin']}><AbonnementPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie', 'admin']}><MessagesPage /></ProtectedRoute>} />
      <Route path="/login" element={user ? <Navigate to={getDashboardPath()} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={getDashboardPath()} /> : <RegisterPage />} />
      <Route path="/confirmer-email" element={<ConfirmEmailPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/annonces" element={<ProtectedRoute roles={['admin']}><AdminListings /></ProtectedRoute>} />
      <Route path="/admin/formations" element={<ProtectedRoute roles={['admin']}><AdminWorkshops /></ProtectedRoute>} />
      <Route path="/admin/conteneurs" element={<ProtectedRoute roles={['admin']}><AdminContainers /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><AdminFinance /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
      <Route path="/admin/signalements" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/newsletter" element={<ProtectedRoute roles={['admin']}><AdminNewsletter /></ProtectedRoute>} />

      {/* Particulier routes */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['particulier']}><DashboardParticulier /></ProtectedRoute>} />
      <Route path="/annonces/creer" element={<ProtectedRoute roles={['particulier', 'professionnel']}><CreateListingPage /></ProtectedRoute>} />
      <Route path="/score" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie']}><ScorePage /></ProtectedRoute>} />
      <Route path="/conteneurs/demande" element={<ProtectedRoute roles={['particulier']}><ContainerRequestPage /></ProtectedRoute>} />
      <Route path="/mes-annonces" element={<ProtectedRoute roles={['particulier', 'professionnel']}><MesAnnoncesPage /></ProtectedRoute>} />
      <Route path="/annonces/:id/modifier" element={<ProtectedRoute roles={['particulier', 'professionnel']}><EditListingPage /></ProtectedRoute>} />

      {/* Professionnel routes */}
      <Route path="/pro" element={<ProtectedRoute roles={['professionnel']}><DashboardPro /></ProtectedRoute>} />
      <Route path="/pro/projets" element={<ProtectedRoute roles={['professionnel']}><ProjetsPro /></ProtectedRoute>} />

      {/* Salarie routes */}
      <Route path="/salarie" element={<ProtectedRoute roles={['salarie']}><DashboardSalarie /></ProtectedRoute>} />
      <Route path="/salarie/formations" element={<ProtectedRoute roles={['salarie']}><SalarieFormations /></ProtectedRoute>} />
      <Route path="/salarie/articles" element={<ProtectedRoute roles={['salarie']}><SalarieArticles /></ProtectedRoute>} />
      <Route path="/salarie/planning" element={<ProtectedRoute roles={['salarie']}><SalariePlanning /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
