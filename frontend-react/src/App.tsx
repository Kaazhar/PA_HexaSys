import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Public pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ListingsPage from './pages/public/ListingsPage';
import ContainersPage from './pages/public/ContainersPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminListings from './pages/admin/AdminListings';
import AdminWorkshops from './pages/admin/AdminWorkshops';
import AdminContainers from './pages/admin/AdminContainers';
import AdminFinance from './pages/admin/AdminFinance';
import AdminCategories from './pages/admin/AdminCategories';

// Particulier pages
import DashboardParticulier from './pages/particulier/DashboardParticulier';
import CreateListingPage from './pages/particulier/CreateListingPage';
import ScorePage from './pages/particulier/ScorePage';
import ContainerRequestPage from './pages/particulier/ContainerRequestPage';

// Professionnel pages
import DashboardPro from './pages/professionnel/DashboardPro';

// Salarie pages
import DashboardSalarie from './pages/salarie/DashboardSalarie';

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
      <Route path="/conteneurs" element={<ContainersPage />} />
      <Route path="/login" element={user ? <Navigate to={getDashboardPath()} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={getDashboardPath()} /> : <RegisterPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/annonces" element={<ProtectedRoute roles={['admin']}><AdminListings /></ProtectedRoute>} />
      <Route path="/admin/formations" element={<ProtectedRoute roles={['admin']}><AdminWorkshops /></ProtectedRoute>} />
      <Route path="/admin/conteneurs" element={<ProtectedRoute roles={['admin']}><AdminContainers /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><AdminFinance /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />

      {/* Particulier routes */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['particulier']}><DashboardParticulier /></ProtectedRoute>} />
      <Route path="/annonces/creer" element={<ProtectedRoute roles={['particulier', 'professionnel']}><CreateListingPage /></ProtectedRoute>} />
      <Route path="/score" element={<ProtectedRoute roles={['particulier', 'professionnel', 'salarie']}><ScorePage /></ProtectedRoute>} />
      <Route path="/conteneurs/demande" element={<ProtectedRoute roles={['particulier']}><ContainerRequestPage /></ProtectedRoute>} />

      {/* Professionnel routes */}
      <Route path="/pro" element={<ProtectedRoute roles={['professionnel']}><DashboardPro /></ProtectedRoute>} />

      {/* Salarie routes */}
      <Route path="/salarie" element={<ProtectedRoute roles={['salarie']}><DashboardSalarie /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
