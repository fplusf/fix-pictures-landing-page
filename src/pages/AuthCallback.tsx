import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error during auth callback:', error);
        navigate('/');
        return;
      }

      if (session) {
        // Successfully authenticated, redirect to app
        navigate('/app');
      } else {
        // No session, redirect to landing
        navigate('/');
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#e636a4] border-r-transparent"></div>
        <p className="text-lg font-semibold text-zinc-700">Completing sign in...</p>
      </div>
    </div>
  );
}
