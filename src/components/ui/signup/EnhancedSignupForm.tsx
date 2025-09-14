import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle, 
  Info, 
  Users, 
  Heart,
  Building2,
  ArrowRight,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface EnhancedSignupFormProps {
  accountType: 'donor' | 'charity';
  setAccountType: (type: 'donor' | 'charity') => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (agree: boolean) => void;
  newsletterOpt: boolean;
  setNewsletterOpt: (opt: boolean) => void;
  error: string;
  success: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const EnhancedSignupForm: React.FC<EnhancedSignupFormProps> = ({
  accountType,
  setAccountType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  agreeTerms,
  setAgreeTerms,
  newsletterOpt,
  setNewsletterOpt,
  error,
  success,
  isSubmitting,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Real-time validation
  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors };
    
    switch (field) {
      case 'email':
        if (!value) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password = 'Password must contain uppercase, lowercase, and number';
        } else {
          delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (value !== password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
      case 'firstName':
        if (!value.trim()) {
          errors.firstName = 'First name is required';
        } else {
          delete errors.firstName;
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          errors.lastName = 'Last name is required';
        } else {
          delete errors.lastName;
        }
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get progress percentage
  const getProgress = () => {
    const fields = [firstName, lastName, email, password, confirmPassword];
    const completedFields = fields.filter(field => field.trim() !== '').length;
    const termsChecked = agreeTerms ? 1 : 0;
    return ((completedFields + termsChecked) / 6) * 100;
  };

  // Role-specific content
  const getRoleContent = () => {
    if (accountType === 'charity') {
      return {
        icon: <Building2 className="h-8 w-8 text-clearcause-primary" />,
        title: "Create Your Charity Account",
        subtitle: "Join our verified network of transparent organizations",
        benefits: [
          "Create transparent campaigns with milestone tracking",
          "Access to verification and credibility badges", 
          "Real-time impact reporting tools",
          "Direct donor engagement platform"
        ],
        nextSteps: [
          "Complete organization verification process",
          "Upload required documentation",
          "Get reviewed by our team",
          "Start creating campaigns"
        ],
        estimatedTime: "5-10 business days for full verification"
      };
    } else {
      return {
        icon: <Heart className="h-8 w-8 text-clearcause-primary" />,
        title: "Create Your Donor Account", 
        subtitle: "Start making transparent, trackable donations",
        benefits: [
          "Track the real impact of your donations",
          "Receive detailed progress updates",
          "Connect directly with beneficiaries",
          "Join a community of transparent giving"
        ],
        nextSteps: [
          "Verify your email address",
          "Explore campaigns that match your interests",
          "Make your first donation",
          "Track your impact in real-time"
        ],
        estimatedTime: "Start donating immediately after verification"
      };
    }
  };

  const roleContent = getRoleContent();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Account Creation Progress</span>
          <span>{Math.round(getProgress())}% Complete</span>
        </div>
        <Progress value={getProgress()} className="h-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {roleContent.icon}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{roleContent.title}</h1>
            <p className="text-gray-600 mt-2">{roleContent.subtitle}</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <div>
                  <div className="font-medium">Account created successfully!</div>
                  <div className="text-sm mt-1">
                    Please check your email and click the verification link to activate your account.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Type Selector */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAccountType('donor')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
                accountType === 'donor'
                  ? 'bg-white text-clearcause-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Heart className="h-4 w-4 mr-2" />
              Donor
            </button>
            <button
              type="button"
              onClick={() => setAccountType('charity')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
                accountType === 'charity'
                  ? 'bg-white text-clearcause-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Organization
            </button>
          </div>
          
          <form className="space-y-6" onSubmit={onSubmit}>
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  id="first-name"
                  name="first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    validateField('firstName', e.target.value);
                  }}
                  onBlur={(e) => validateField('firstName', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                    fieldErrors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your first name"
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  id="last-name"
                  name="last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    validateField('lastName', e.target.value);
                  }}
                  onBlur={(e) => validateField('lastName', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                    fieldErrors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your last name"
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateField('email', e.target.value);
                }}
                onBlur={(e) => validateField('email', e.target.value)}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Fields */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validateField('password', e.target.value);
                    if (confirmPassword) {
                      validateField('confirmPassword', confirmPassword);
                    }
                  }}
                  onBlur={(e) => validateField('password', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                    fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
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
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
              <div className="mt-1 text-xs text-gray-500">
                Must contain at least 8 characters with uppercase, lowercase, and number
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateField('confirmPassword', e.target.value);
                }}
                onBlur={(e) => validateField('confirmPassword', e.target.value)}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                  fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Checkboxes */}
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
                  <label htmlFor="agree-terms" className="text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" className="text-clearcause-primary hover:text-clearcause-secondary font-medium">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-clearcause-primary hover:text-clearcause-secondary font-medium">
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
                  <label htmlFor="newsletter" className="text-gray-700">
                    Subscribe to updates about new campaigns and impact stories
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90 py-3 px-4 text-base"
                disabled={isSubmitting || success || Object.keys(fieldErrors).length > 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Account Created
                  </>
                ) : (
                  <>
                    Create {accountType === 'charity' ? 'Organization' : 'Donor'} Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account?</span>
            <Link to="/login" className="ml-1 font-medium text-clearcause-primary hover:text-clearcause-secondary">
              Sign in
            </Link>
          </div>
        </div>

        {/* Information Panel */}
        <div className="space-y-6">
          {/* Benefits Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Why Choose ClearCause?
              </h3>
              <ul className="space-y-3">
                {roleContent.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ArrowRight className="h-5 w-5 mr-2" />
                What Happens Next?
              </h3>
              <ol className="space-y-3">
                {roleContent.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 bg-clearcause-primary text-white rounded-full text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="font-medium">Timeline:</span>&nbsp;{roleContent.estimatedTime}
                </p>
              </div>
            </CardContent>
          </Card>

          {accountType === 'charity' && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-2 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Important for Organizations
                </h3>
                <p className="text-sm text-amber-800 mb-3">
                  As a registered charity or nonprofit organization, you'll need to provide:
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Organization registration documents</li>
                  <li>• Tax-exempt status proof</li>
                  <li>• Leadership contact information</li>
                  <li>• Mission statement and program details</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSignupForm;