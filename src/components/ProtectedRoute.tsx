import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSubscription } from '@/src/hooks/useSubscription';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#e636a4] border-r-transparent"></div>
          <p className="text-lg font-semibold text-zinc-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Wraps /app — redirects to /upgrade when the free quota is exhausted. */
export function AppRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { plan, canProcess, loading: subLoading } = useSubscription();

  if (authLoading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#e636a4] border-r-transparent"></div>
          <p className="text-lg font-semibold text-zinc-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const isPaid = plan === 'starter' || plan === 'growth' || plan === 'pro' || plan === 'lifetime';
  if (!isPaid && !canProcess) return <Navigate to="/upgrade" replace />;

  return <>{children}</>;
}
