
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CreditCard, UserRound, Settings, LogOut, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { performCompleteLogout } from '@/utils/sessionManager';

interface DonorLayoutProps {
  children: React.ReactNode;
  title: string;
}

const DonorLayout: React.FC<DonorLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutConfirm = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setShowLogoutDialog(false);

      const result = await signOut();
      if (result.success) {
        toast({
          title: "Logged out successfully",
          description: "You have been signed out of your donor account.",
        });
        // Use enhanced complete logout for session isolation
        await performCompleteLogout('/login');
      } else {
        toast({
          title: "Logout failed",
          description: result.error || "An error occurred during logout.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[DonorLayout] Logout error:', error);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      // Force cleanup even on error
      await performCompleteLogout('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };
  
  const navItems = [
    { 
      path: '/donor/dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" /> 
    },
    { 
      path: '/donor/donations', 
      label: 'My Donations', 
      icon: <CreditCard className="w-5 h-5" /> 
    },
    { 
      path: '/donor/profile', 
      label: 'My Profile', 
      icon: <UserRound className="w-5 h-5" /> 
    },
    { 
      path: '/donor/settings', 
      label: 'Settings', 
      icon: <Settings className="w-5 h-5" /> 
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <div className="flex-grow flex flex-col md:flex-row bg-clearcause-background">
        {/* Sidebar */}
        <aside className="bg-white w-full md:w-64 md:min-h-[calc(100vh-4rem)] shadow-sm">
          <div className="p-4 md:p-6 h-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 hidden md:block">Donor Account</h2>
            
            <div className="flex md:flex-col space-x-4 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-visible py-2 md:py-0">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2 rounded-md text-sm font-medium
                    ${isActive 
                      ? 'bg-clearcause-primary/10 text-clearcause-primary' 
                      : 'text-gray-600 hover:text-clearcause-primary hover:bg-gray-100'
                    }
                  `}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              ))}
              
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut || authLoading}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mt-8 md:mt-auto w-full text-left transition-colors ${
                  isLoggingOut || authLoading 
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
                    : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                {isLoggingOut || authLoading ? (
                  <>
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    <span className="ml-3">Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5" />
                    <span className="ml-3">Logout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>

      <Footer />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your donor account? You will need to log in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DonorLayout;
