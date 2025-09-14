import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (Supabase sends tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error_code = hashParams.get('error_code');
        const error_description = hashParams.get('error_description');

        // Handle errors from Supabase
        if (error_code) {
          setError(error_description || 'Email confirmation failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (type === 'signup' || type === 'email_confirmation') {
          // Handle email confirmation
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
              setError('Failed to confirm email. Please try logging in manually.');
              setTimeout(() => navigate('/login'), 3000);
              return;
            }
            
            // Give the auth state change listener a moment to process
            if (data.user) {
              setTimeout(() => {
                if (!user && !loading) {
                  // Use role from session if available
                  const role = data.user.user_metadata?.role || 'donor';
                  switch (role) {
                    case 'charity':
                      navigate('/charity/dashboard', { replace: true });
                      break;
                    case 'admin':
                      navigate('/admin/dashboard', { replace: true });
                      break;
                    default:
                      navigate('/donor/dashboard', { replace: true });
                      break;
                  }
                }
              }, 1000);
            }
          } else {
            setError('Invalid confirmation link. Please try logging in manually.');
            setTimeout(() => navigate('/login'), 3000);
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('An error occurred during email confirmation.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, user, loading]);

  // Once user is loaded, redirect to appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      // Add a small delay to ensure auth state is fully settled
      const redirectTimer = setTimeout(() => {
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            navigate('/admin/dashboard', { replace: true });
            break;
          case 'charity':
            navigate('/charity/dashboard', { replace: true });
            break;
          case 'donor':
          default:
            navigate('/donor/dashboard', { replace: true });
            break;
        }
      }, 300);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, loading, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">
              Email Confirmation Error
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-clearcause-primary mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Confirming your email...
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your email and set up your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
