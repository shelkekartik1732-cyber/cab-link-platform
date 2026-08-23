import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { CustomerBooking } from './pages/public/CustomerBooking';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Admin Pages
import { OnboardingPage } from './pages/admin/OnboardingPage';
import { BookingsListPage } from './pages/admin/BookingsListPage';
import { CreateBookingPage } from './pages/admin/CreateBookingPage';
import { BookingDetailPage } from './pages/admin/BookingDetailPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { BusinessPage } from './pages/admin/BusinessPage';
import { Loader2 } from 'lucide-react';

// Protected Route Guard (Requires Authentication)
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-xs font-bold text-slate-500">Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Onboarding Guard (Ensures completed onboarding for admin pages)
const RequireOnboarded: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { onboardingCompleted, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-xs font-bold text-slate-500">Loading account status...</p>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/admin/onboarding" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking/:bookingToken" element={<CustomerBooking />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* First Time Driver Onboarding */}
          <Route
            path="/admin/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />

          {/* Admin Routes with Operational Admin Layout */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/bookings" replace />}
          />

          <Route
            path="/admin/bookings"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AdminLayout>
                    <BookingsListPage />
                  </AdminLayout>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/bookings/new"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AdminLayout>
                    <CreateBookingPage />
                  </AdminLayout>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/bookings/:id"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AdminLayout>
                    <BookingDetailPage />
                  </AdminLayout>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AdminLayout>
                    <ProfilePage />
                  </AdminLayout>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/business"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AdminLayout>
                    <BusinessPage />
                  </AdminLayout>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          {/* Fallback 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
