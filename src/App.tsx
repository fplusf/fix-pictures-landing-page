import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from '@/src/pages/LandingPage';
import ImageFixerApp from '@/src/pages/ImageFixerApp';
import TermsOfService from '@/src/pages/TermsOfService';
import PrivacyPolicy from '@/src/pages/PrivacyPolicy';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<ImageFixerApp />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
