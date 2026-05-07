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
import SupportPage from '@/src/pages/SupportPage';
import ProtectedRoute, { AppRoute } from '@/src/components/ProtectedRoute';
import AmazonImageRequirements from '@/src/pages/seo/AmazonImageRequirements';
import RemoveBackgroundAmazon from '@/src/pages/seo/RemoveBackgroundAmazon';
import AmazonWhiteBackground from '@/src/pages/seo/AmazonWhiteBackground';
import AmazonImageSize from '@/src/pages/seo/AmazonImageSize';
import AmazonListingImageChecker from '@/src/pages/seo/AmazonListingImageChecker';
import FixAmazonProductPhotos from '@/src/pages/seo/FixAmazonProductPhotos';

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
      <Route path="/support" element={<SupportPage />} />
      <Route path="/amazon-image-requirements" element={<AmazonImageRequirements />} />
      <Route path="/remove-background-amazon" element={<RemoveBackgroundAmazon />} />
      <Route path="/amazon-white-background" element={<AmazonWhiteBackground />} />
      <Route path="/amazon-image-size" element={<AmazonImageSize />} />
      <Route path="/amazon-listing-image-checker" element={<AmazonListingImageChecker />} />
      <Route path="/fix-amazon-product-photos" element={<FixAmazonProductPhotos />} />
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
