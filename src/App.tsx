import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import posthog from 'posthog-js';
import LandingPage from '@/src/pages/LandingPage';
import ImageFixerApp from '@/src/pages/ImageFixerApp';
import TermsOfService from '@/src/pages/TermsOfService';
import PrivacyPolicy from '@/src/pages/PrivacyPolicy';
import RefundPolicy from '@/src/pages/RefundPolicy';
import PricingPage from '@/src/pages/PricingPage';
import AuthCallback from '@/src/pages/AuthCallback';
import UpgradePage from '@/src/pages/UpgradePage';
import ProtectedRoute, { AppRoute } from '@/src/components/ProtectedRoute';

export default function AppRouter() {
  const location = useLocation();

  useEffect(() => {
    posthog.capture('$pageview');
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/app"
        element={
          <AppRoute>
            <ImageFixerApp />
          </AppRoute>
        }
      />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route
        path="/upgrade"
        element={
          <ProtectedRoute>
            <UpgradePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
