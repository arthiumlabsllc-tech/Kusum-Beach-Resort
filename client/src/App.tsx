import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';

// Dashboard
import DashboardPage from './pages/DashboardPage';

// POS Pages
import POSPage from './pages/POSPage';

// Inventory Pages
import ProductsPage from './pages/ProductsPage';

// Orders
import OrdersPage from './pages/OrdersPage';

// Reports
import ReportsPage from './pages/ReportsPage';

// Alerts
import AlertsPage from './pages/AlertsPage';

// Staff
import StaffPage from './pages/StaffPage';

// Settings
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Protected Pages */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* POS Module */}
        <Route path="pos" element={<POSPage />} />

        {/* Inventory Module */}
        <Route path="inventory" element={<ProductsPage />} />

        {/* Orders */}
        <Route path="orders" element={<OrdersPage />} />

        {/* Reports Module */}
        <Route path="reports" element={<ReportsPage />} />

        {/* Alerts Module */}
        <Route path="alerts" element={<AlertsPage />} />

        {/* Staff Module */}
        <Route path="staff" element={<StaffPage />} />

        {/* Settings Module */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          theme="colored"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
