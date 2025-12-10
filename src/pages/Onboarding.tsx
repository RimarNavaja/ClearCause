import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/lib/types';
import { Heart, Building2, Loader2, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { toast } from 'sonner';

const Onboarding: React.FC = () => {
  const { user, completeOnboarding, loading } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  // Split existing full name if available
  useEffect(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length > 0) {
        setFirstName(names[0]);
        if (names.length > 1) {
          setLastName(names.slice(1).join(' '));
        }
      }
    }
  }, [user]);

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (user.onboardingCompleted) {
        // If already onboarded, redirect to appropriate dashboard
        if (user.role === 'charity') {
          navigate('/charity/dashboard');
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/donor/dashboard');
        }
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstNameError(null);
    setLastNameError(null);

    let isValid = true;
    const nameRegex = /^[a-zA-Z\s\-\.\']{2,50}$/; // Adjusted max length to 50

    if (!firstName.trim()) {
      setFirstNameError('First Name is required.');
      isValid = false;
    } else if (!nameRegex.test(firstName)) {
      setFirstNameError('First Name contains invalid characters');
      isValid = false;
    }

    if (!lastName.trim()) {
      setLastNameError('Last Name is required.');
      isValid = false;
    } else if (!nameRegex.test(lastName)) {
      setLastNameError('Last Name contains invalid characters');
      isValid = false;
    }

    if (!selectedRole) {
      toast.error('Please select an account type.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeOnboarding(firstName, lastName, selectedRole);
      
      if (result.success) {
        toast.success('Profile setup complete! Welcome to ClearCause.');
        
        // Force redirect immediately for better UX
        if (selectedRole === 'charity') {
          navigate('/charity/dashboard');
        } else if (selectedRole === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/donor/dashboard');
        }
      } else {
        toast.error(result.error || 'Failed to complete setup. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-clearcause-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-poppinsregular">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <img
                  src="/CLEARCAUSE-logo.svg"
                  alt="ClearCause"
                  className="h-10 w-13 mx-auto mb-4"
                />
            <CardTitle className="text-3xl font-bold text-gray-900 font-robotobold">Welcome to ClearCause</CardTitle>
            <CardDescription className="text-lg mt-2">
              Let's finish setting up your account, tell us a bit more about yourself.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8">
              
              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      required
                    />
                    {firstNameError && <p className="text-red-500 text-sm mt-1">{firstNameError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      required
                    />
                    {lastNameError && <p className="text-red-500 text-sm mt-1">{lastNameError}</p>}
                  </div>
                </div>
              </div>

              {/* Account Type Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Choose Account Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Donor Option */}
                  <div 
                    className={`relative border rounded-xl p-6 cursor-pointer transition-all hover:border-clearcause-primary ${
                      selectedRole === 'donor' 
                        ? 'border-clearcause-primary bg-blue-50 ring-2 ring-clearcause-primary ring-offset-2' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => setSelectedRole('donor')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {/* <div className={`p-3 rounded-full ${selectedRole === 'donor' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Heart className="h-6 w-6" />
                      </div>
                      {selectedRole === 'donor' && (
                        <CheckCircle2 className="h-6 w-6 text-clearcause-primary" />
                      )} */}
                    </div>
                    <h4 className="text-xl font-semibold mb-2">Donor</h4>
                    <p className="text-gray-600 text-sm">
                      I want to discover causes, make donations, and track the impact of my contributions.
                    </p>
                  </div>

                  {/* Charity Option */}
                  <div 
                    className={`relative border rounded-xl p-6 cursor-pointer transition-all hover:border-clearcause-primary ${
                      selectedRole === 'charity' 
                        ? 'border-clearcause-primary bg-blue-50 ring-2 ring-clearcause-primary ring-offset-2' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => setSelectedRole('charity')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {/* <div className={`p-3 rounded-full ${selectedRole === 'charity' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      {selectedRole === 'charity' && (
                        <CheckCircle2 className="h-6 w-6 text-clearcause-primary" />
                      )} */}
                    </div>
                    <h4 className="text-xl font-semibold mb-2">Organization</h4>
                    <p className="text-gray-600 text-sm">
                      I represent a charity or non-profit organization looking to raise funds for our causes.
                    </p>
                  </div>

                </div>
              </div>

            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full text-lg py-6 bg-blue-700 hover:bg-blue-600 font-redhatbold" 
                disabled={isSubmitting || !selectedRole || !firstName || !lastName}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Onboarding;
