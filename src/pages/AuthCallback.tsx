import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Confirming your email...');

  useEffect(() => {
    let hasProcessed = false; // Prevent multiple executions

    // Safety timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.warn('[AuthCallback] Processing timeout - forcing redirect to home');
      navigate('/');
    }, 10000);

    const handleAuthCallback = async () => {
      if (hasProcessed) {
        console.log('[AuthCallback] Already processed, skipping...');
        return;
      }
      hasProcessed = true;

      try {
        // Get the hash from the URL (Supabase sends tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error_code = hashParams.get('error_code');
        const error_description = hashParams.get('error_description');

        console.log('[AuthCallback] Processing callback with type:', type);
        console.log('[AuthCallback] Has tokens:', !!accessToken && !!refreshToken);

        // Handle errors from Supabase
        if (error_code) {
          console.error('[AuthCallback] Supabase error:', error_code, error_description);
          setError(error_description || 'Email confirmation failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check for email confirmation scenarios
        const isEmailConfirmation = (
          (type === 'signup' || type === 'email_confirmation' || type === 'magiclink') ||
          (accessToken && refreshToken && window.location.hash.includes('access_token')) ||
          (window.location.hash.includes('type=email') || window.location.hash.includes('type=confirmation'))
        );

        if (isEmailConfirmation) {
          // Handle email confirmation
          if (accessToken && refreshToken) {
            setStatus('Setting up your session...');
            console.log('[AuthCallback] Setting session with tokens');

            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[AuthCallback] Error setting session:', error);
              setError('Failed to confirm email. Please try logging in manually.');
              setTimeout(() => navigate('/login'), 3000);
              return;
            }

            if (data.user) {
              console.log('[AuthCallback] Session set successfully for user:', data.user.id);

              // Check if the user is an existing email/password user trying to sign in with Google
              // Supabase may merge them, but if we want to enforce separation or warn the user:
              if (data.user.app_metadata.provider === 'email' && type !== 'signup' && type !== 'email_confirmation' && type !== 'magiclink') {
                 // Check if the current session is actually using Google (OAuth)
                 // We can check the amr (Authentication Methods References) claim in the JWT if available, 
                 // or infer from the fact we are in the OAuth callback and the provider is 'email'.
                 // However, app_metadata.provider usually reflects the *first* provider. 
                 // If it's 'email', and we are here (OAuth callback), it's a merge attempt or a login to existing account.
                 
                 // Note: If you want to STRICTLY prevent Google login for existing email users:
                 console.warn('[AuthCallback] Detected Google sign-in for existing email user');
                 setError('This email is already registered with a password. Please log in with your password to access your account.');
                 await supabase.auth.signOut();
                 setTimeout(() => navigate('/login'), 4000);
                 return;
              }

              setStatus('Setting up your profile...');

              // Check if profile exists directly
              const { data: existingProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

              if (profileError) {
                console.error('[AuthCallback] Error checking profile:', profileError);
                setError('Database error while setting up your profile. Please try logging in manually.');
                setTimeout(() => navigate('/login'), 3000);
                return;
              }

              let userProfile = existingProfile;

              // If no profile exists, create one
              if (!existingProfile) {
                console.log('[AuthCallback] No profile found, creating one...');
                setStatus('Creating your profile...');

                // Try using the database function first
                try {
                  const { data: functionResult, error: functionError } = await supabase
                    .rpc('ensure_user_profile', {
                      p_user_id: data.user.id,
                      p_email: data.user.email || '',
                      p_full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
                      p_role: (data.user.user_metadata?.role || 'donor')
                    });

                  if (functionError) {
                    console.warn('[AuthCallback] Function failed, trying direct insert:', functionError);

                    // Fallback to direct insert
                    const { data: insertedProfile, error: insertError } = await supabase
                      .from('profiles')
                      .insert({
                        id: data.user.id,
                        email: data.user.email || '',
                        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
                        role: data.user.user_metadata?.role || 'donor',
                        is_verified: true, // Email is verified at this point
                        is_active: true,
                        onboarding_completed: true
                      })
                      .select()
                      .single();

                    if (insertError) {
                      console.error('[AuthCallback] Failed to create profile:', insertError);
                      setError('Failed to create your profile. Please try logging in manually.');
                      setTimeout(() => navigate('/login'), 3000);
                      return;
                    }

                    userProfile = insertedProfile;
                    console.log('[AuthCallback] Profile created via direct insert:', userProfile);
                  } else {
                    console.log('[AuthCallback] Profile created via function:', functionResult);

                    // Fetch the created profile
                    const { data: fetchedProfile, error: fetchError } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', data.user.id)
                      .single();

                    if (fetchError || !fetchedProfile) {
                      console.error('[AuthCallback] Failed to fetch created profile:', fetchError);
                      setError('Profile created but failed to load. Please try logging in manually.');
                      setTimeout(() => navigate('/login'), 3000);
                      return;
                    }

                    userProfile = fetchedProfile;
                  }
                } catch (profileCreationError) {
                  console.error('[AuthCallback] Profile creation error:', profileCreationError);
                  setError('Failed to create your profile. Please try logging in manually.');
                  setTimeout(() => navigate('/login'), 3000);
                  return;
                }
              }

              // At this point we should have a valid profile
              if (!userProfile) {
                console.error('[AuthCallback] No profile available after creation attempts');
                setError('Failed to set up your profile. Please try logging in manually.');
                setTimeout(() => navigate('/login'), 3000);
                return;
              }

              // Auto-fix: If profile exists but onboarding is not marked complete, fix it now
              // This prevents the infinite loop where users are redirected to onboarding but can't proceed
              if (userProfile && !userProfile.onboarding_completed) {
                console.log('[AuthCallback] Profile exists but onboarding incomplete. Auto-fixing...');
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ onboarding_completed: true })
                  .eq('id', userProfile.id);
                  
                if (updateError) {
                  console.warn('[AuthCallback] Failed to auto-fix onboarding status:', updateError);
                } else {
                  console.log('[AuthCallback] Onboarding status fixed');
                  userProfile.onboarding_completed = true;
                  
                  // Also try to update user metadata
                  try {
                    await supabase.auth.updateUser({
                      data: { onboarding_completed: true }
                    });
                  } catch (metaError) {
                    console.warn('[AuthCallback] Failed to sync metadata:', metaError);
                  }
                }
              }

              console.log('[AuthCallback] Profile ready:', userProfile);
              setStatus('Redirecting to your dashboard...');

              // Wait a moment for auth state to propagate
              await new Promise(resolve => setTimeout(resolve, 500));

              // Clear the URL hash to prevent re-processing
              window.history.replaceState({}, document.title, window.location.pathname);

              // Redirect based on role immediately
              const role = userProfile.role || 'donor';
              console.log('[AuthCallback] Redirecting to dashboard for role:', role);

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
            } else {
              console.error('[AuthCallback] No user data after setting session');
              setError('Session setup failed. Please try logging in manually.');
              setTimeout(() => navigate('/login'), 3000);
            }
          } else {
            console.error('[AuthCallback] Missing tokens in callback');
            setError('Invalid confirmation link. Please try logging in manually.');
            setTimeout(() => navigate('/login'), 3000);
          }
        } else if (!accessToken && !refreshToken) {
          // No tokens and no recognized type - redirect to login
          console.log('[AuthCallback] No tokens found, redirecting to login');
          navigate('/login', { replace: true });
        } else {
          // Has tokens but unrecognized type - treat as email confirmation
          console.log('[AuthCallback] Unknown type but has tokens, treating as email confirmation');
          setError('Invalid confirmation link format. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        setError('An unexpected error occurred during email confirmation.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    // Only run once when component mounts
    handleAuthCallback();
  }, []); // Empty dependency array to run only once


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-poppinsregular">
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

  // Loading / processing state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-poppinsregular">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-clearcause-primary mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2 font-robotobold">
            {status}
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
