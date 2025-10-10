
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EnhancedSignupForm from '@/components/ui/signup/EnhancedSignupForm';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();

  // Clean up logout parameters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('_logout') || params.has('_clear') || params.has('_nuclear') || params.has('_nocache')) {
      // Remove all logout-related parameters
      params.delete('_logout');
      params.delete('_clear');
      params.delete('_nuclear');
      params.delete('_nocache');

      // Update URL without reload
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
      console.log('[Signup] Cleaned up logout parameters from URL');
    }
  }, []);

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
    setIsSubmitting(true);

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      setIsSubmitting(false);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-clearcause-background py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <EnhancedSignupForm
            accountType={accountType}
            setAccountType={setAccountType}
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            agreeTerms={agreeTerms}
            setAgreeTerms={setAgreeTerms}
            newsletterOpt={newsletterOpt}
            setNewsletterOpt={setNewsletterOpt}
            error={error}
            success={success}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Signup;
