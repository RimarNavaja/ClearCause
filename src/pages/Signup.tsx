
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/lib/config';
import { validateData, signUpSchema } from '@/utils/validation';
import { ClearCauseError, UserRole } from '@/lib/types';

const Signup: React.FC = () => {
  const [accountType, setAccountType] = useState<'donor' | 'charity'>('donor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [newsletterOpt, setNewsletterOpt] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Validate form data
      const validatedData = validateData(signUpSchema, {
        email,
        password,
        fullName,
        role: accountType as UserRole,
      });

      // Attempt signup
      const result = await signUp(validatedData);

      if (result.success) {
        setSuccess(true);
        
        // If email verification is enabled, show success message
        // Otherwise redirect based on account type
        if (config.features.emailVerification) {
          // Success message will be shown, user needs to verify email
        } else {
          // Redirect based on account type
          setTimeout(() => {
            if (accountType === 'charity') {
              navigate(config.routes.charity.application);
            } else {
              navigate(config.routes.home);
            }
          }, 2000);
        }
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      if (error instanceof ClearCauseError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center bg-clearcause-background py-12">
        <div className="max-w-md w-full mx-auto px-4 sm:px-6">
          <div className="bg-white shadow rounded-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
              <p className="text-gray-600 mt-2">Join ClearCause to start making a transparent impact</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <div>
                    <div className="font-medium">Account created successfully!</div>
                    {config.features.emailVerification && (
                      <div className="text-sm mt-1">
                        Please check your email and click the verification link to activate your account.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Account Type Selector */}
            <div className="flex mb-6">
              <button
                type="button"
                onClick={() => setAccountType('donor')}
                className={`flex-1 text-center py-3 rounded-l-md transition-colors ${
                  accountType === 'donor'
                    ? 'bg-clearcause-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Donor
              </button>
              <button
                type="button"
                onClick={() => setAccountType('charity')}
                className={`flex-1 text-center py-3 rounded-r-md transition-colors ${
                  accountType === 'charity'
                    ? 'bg-clearcause-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Charity / Creator
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary"
                  />
                </div>

                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="agree-terms"
                      name="agree-terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="h-4 w-4 text-clearcause-primary focus:ring-clearcause-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="agree-terms" className="text-gray-600">
                      I agree to the{' '}
                      <Link to="/terms" className="text-clearcause-primary hover:text-clearcause-secondary">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-clearcause-primary hover:text-clearcause-secondary">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="newsletter"
                      name="newsletter"
                      type="checkbox"
                      checked={newsletterOpt}
                      onChange={(e) => setNewsletterOpt(e.target.checked)}
                      className="h-4 w-4 text-clearcause-primary focus:ring-clearcause-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="newsletter" className="text-gray-600">
                      Subscribe to our newsletter to receive updates about new campaigns and impact stories
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90 py-2 px-4"
                  disabled={loading || success}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Account Created
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span className="sr-only">Sign up with Google</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.71 17.55V20.25H19.28C21.36 18.31 22.56 15.57 22.56 12.25Z" fill="#4285F4"/>
                    <path d="M12 23C14.97 23 17.46 22.01 19.28 20.25L15.71 17.55C14.73 18.19 13.48 18.58 12 18.58C9.09 18.58 6.63 16.65 5.72 14.04H2.05V16.82C3.87 20.42 7.62 23 12 23Z" fill="#34A853"/>
                    <path d="M5.72 14.04C5.5 13.41 5.37 12.73 5.37 12.01C5.37 11.29 5.5 10.61 5.72 9.98002V7.20002H2.05C1.23 8.95002 0.77 10.92 0.77 12.01C0.77 13.1 1.23 15.07 2.05 16.82L5.72 14.04Z" fill="#FBBC05"/>
                    <path d="M12 5.42C13.62 5.42 15.06 5.99 16.21 7.07L19.36 3.92C17.45 2.14 14.97 1 12 1C7.62 1 3.87 3.58 2.05 7.18L5.72 9.96C6.63 7.35 9.09 5.42 12 5.42Z" fill="#EA4335"/>
                  </svg>
                </a>

                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span className="sr-only">Sign up with Facebook</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073C24 5.40365 18.6274 0 12 0C5.37258 0 0 5.40365 0 12.073C0 18.0988 4.38823 23.0935 10.125 24V15.563H7.07812V12.073H10.125V9.41306C10.125 6.38751 11.9153 4.71627 14.6574 4.71627C15.9705 4.71627 17.3438 4.95189 17.3438 4.95189V7.92146H15.8306C14.3398 7.92146 13.875 8.85225 13.875 9.8069V12.073H17.2031L16.6711 15.563H13.875V24C19.6118 23.0935 24 18.0988 24 12.073Z" fill="#1877F2"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account?</span>
              <Link to="/login" className="ml-1 font-medium text-clearcause-primary hover:text-clearcause-secondary">
                Sign in
              </Link>
            </div>

            {accountType === 'charity' && (
              <div className="mt-6 bg-clearcause-muted p-4 rounded-md text-sm">
                <p className="text-gray-700 font-medium">Important for Charity / Campaign Creator accounts:</p>
                <ul className="mt-2 list-disc pl-5 text-gray-600 space-y-1">
                  <li>After sign up, you'll need to complete a verification process</li>
                  <li>Be prepared to provide your organization's registration documents</li>
                  <li>A member of our team will contact you to complete the process</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Signup;
