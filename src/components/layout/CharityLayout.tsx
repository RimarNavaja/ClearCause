
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListChecks, 
  BadgeCheck, 
  DollarSign, 
  Landmark, 
  LogOut,
  Bell,
  User
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';

interface CharityLayoutProps {
  children: React.ReactNode;
  title: string;
}

const CharityLayout: React.FC<CharityLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      console.debug('CharityLayout: Logout already in progress, ignoring duplicate click');
      return;
    }

    try {
      setIsLoggingOut(true);
      console.debug('CharityLayout: Starting logout...');
      
      // Reduce timeout to 5 seconds and handle network issues gracefully
      const logoutPromise = signOut();
      const timeoutPromise = new Promise<{success: boolean, error?: string}>((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout - continuing logout locally')), 5000)
      );
      
      let result;
      try {
        result = await Promise.race([logoutPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('CharityLayout: Server logout timed out, but local state should be cleared:', timeoutError.message);
        result = { success: false, error: 'Network timeout - local logout completed' };
      }
      
      if (result.success) {
        console.debug('CharityLayout: Logout successful, preparing to redirect...');
      } else {
        console.warn('CharityLayout: Logout had issues but continuing:', result.error);
      }
      
      // Small delay to ensure auth state changes have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.debug('CharityLayout: Redirecting to home page...');
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('CharityLayout: Logout error:', error);
      
      // Even on error, still try to navigate away
      // The signOut function should have cleared local state regardless
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/', { replace: true });
      
    } finally {
      // Reset local loading state
      setIsLoggingOut(false);
    }
  };
  
  const navItems = [
    { 
      path: '/charity/dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" /> 
    },
    { 
      path: '/charity/campaigns', 
      label: 'Manage Campaigns', 
      icon: <ListChecks className="w-5 h-5" /> 
    },
    { 
      path: '/charity/verifications', 
      label: 'Verification Status', 
      icon: <BadgeCheck className="w-5 h-5" /> 
    },
    { 
      path: '/charity/funds', 
      label: 'Funds Management', 
      icon: <DollarSign className="w-5 h-5" /> 
    },
    { 
      path: '/charity/profile', 
      label: 'Organization Profile', 
      icon: <Landmark className="w-5 h-5" /> 
    },
    { 
      path: '/charity/settings', 
      label: 'Settings', 
      icon: <Bell className="w-5 h-5" /> 
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <div className="flex-grow flex flex-col md:flex-row bg-clearcause-background">
        {/* Sidebar */}
        <aside className="bg-white w-full md:w-64 md:min-h-[calc(100vh-4rem)] shadow-sm">
          <div className="p-4 md:p-6 h-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 hidden md:block">Charity Portal</h2>
            
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
                onClick={handleLogout}
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
    </div>
  );
};

export default CharityLayout;
