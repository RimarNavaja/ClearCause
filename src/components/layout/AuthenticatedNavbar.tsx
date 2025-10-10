import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  CreditCard,
  Building2,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/hooks/useAuth';
import { User as UserType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { performCompleteLogout } from '@/utils/sessionManager';

interface AuthenticatedNavbarProps {
  user: UserType;
}

const AuthenticatedNavbar: React.FC<AuthenticatedNavbarProps> = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get role-specific dashboard link
  const getDashboardLink = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'charity':
        return '/charity/dashboard';
      case 'donor':
        return '/donor/dashboard';
      default:
        return '/';
    }
  };

  // Get role-specific navigation items
  const getRoleSpecificNavItems = (role: string) => {
    switch (role) {
      case 'donor':
        return [
          { to: '/donor/donations', label: 'My Donations', icon: <CreditCard className="h-4 w-4" /> },
          { to: '/donor/profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
        ];
      case 'charity':
        return [
          { to: '/charity/campaigns', label: 'My Campaigns', icon: <Building2 className="h-4 w-4" /> },
          { to: '/charity/profile', label: 'Organization Profile', icon: <Building2 className="h-4 w-4" /> },
        ];
      case 'admin':
        return [
          { to: '/admin/verifications', label: 'Verifications', icon: <ShieldCheck className="h-4 w-4" /> },
          { to: '/admin/charities', label: 'Manage Charities', icon: <Building2 className="h-4 w-4" /> },
        ];
      default:
        return [];
    }
  };

  const handleLogoutConfirm = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      setShowLogoutDialog(false);
      setIsUserMenuOpen(false);

      const result = await signOut();
      if (result.success) {
        toast({
          title: "Logged out successfully",
          description: `You have been signed out of your ${user.role} account.`,
        });

        // Use enhanced complete logout for session isolation
        if (user.role === 'admin') {
          await performCompleteLogout('/admin/login');
        } else {
          await performCompleteLogout('/login');
        }
      } else {
        toast({
          title: "Logout failed",
          description: result.error || "An error occurred during logout.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[AuthenticatedNavbar] Logout error:', error);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      // Force cleanup even on error
      if (user.role === 'admin') {
        await performCompleteLogout('/admin/login');
      } else {
        await performCompleteLogout('/login');
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    setShowLogoutDialog(true);
  };

  const roleSpecificItems = getRoleSpecificNavItems(user.role);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <img
                  src="/logo.png"
                  alt="ClearCause"
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/campaigns" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Browse Campaigns
              </Link>
              <Link 
                to="/how-it-works" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                How It Works
              </Link>
              <Link 
                to="/about" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                About Us
              </Link>
            </div>
          </div>
          
          {/* Desktop Right Side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search campaigns..."
                className="pl-10 block w-full rounded-md border border-gray-300 bg-white py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-clearcause-primary focus:border-clearcause-primary"
              />
            </div>
            
            {/* Dashboard Button */}
            <Link to={getDashboardLink(user.role)}>
              <Button variant="outline" className="text-clearcause-primary hover:text-clearcause-primary border-clearcause-primary hover:border-clearcause-primary">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-clearcause-primary focus:ring-offset-2"
              >
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <div className="flex items-center justify-center w-8 h-8 bg-clearcause-primary text-white rounded-full text-xs font-medium">
                    {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden lg:block">
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                </div>
              </button>
              
              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.fullName || 'User'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">
                      {user.role} Account
                      {user.isVerified && <span className="text-green-600 ml-1">• Verified</span>}
                    </p>
                  </div>
                  
                  {/* Dashboard Link */}
                  <Link
                    to={getDashboardLink(user.role)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-3" />
                    Dashboard
                  </Link>
                  
                  {/* Role-specific Items */}
                  {roleSpecificItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.to}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      {item.icon && <span className="mr-3">{item.icon}</span>}
                      {item.label}
                    </Link>
                  ))}
                  
                  <div className="border-t border-gray-100"></div>
                  
                  {/* Settings */}
                  <Link
                    to={`/${user.role}/settings`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Link>
                  
                  {/* Logout */}
                  <button
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-4 h-4 mr-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-clearcause-primary"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/campaigns"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              Browse Campaigns
            </Link>
            <Link
              to="/how-it-works"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              How It Works
            </Link>
            <Link
              to="/about"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              About Us
            </Link>
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {/* Mobile User Info */}
            <div className="px-4 mb-3">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-clearcause-primary text-white rounded-full text-sm font-medium">
                  {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.fullName || 'User'}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            </div>
            
            {/* Mobile Search */}
            <div className="px-4 mb-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="pl-10 block w-full rounded-md border border-gray-300 bg-white py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-clearcause-primary focus:border-clearcause-primary"
                />
              </div>
            </div>
            
            {/* Mobile Menu Items */}
            <div className="px-4 space-y-2">
              <Link to={getDashboardLink(user.role)} className="block w-full">
                <Button className="w-full bg-clearcause-primary hover:bg-clearcause-secondary">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              
              {/* Role-specific mobile items */}
              {roleSpecificItems.map((item, index) => (
                <Link 
                  key={index}
                  to={item.to} 
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md"
                >
                  {item.icon && <span className="mr-3">{item.icon}</span>}
                  {item.label}
                </Link>
              ))}
              
              <Link 
                to={`/${user.role}/settings`} 
                className="flex items-center px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md"
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Link>
              
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 mr-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your {user.role} account? You will need to log in again to access your dashboard.
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
    </nav>
  );
};

export default AuthenticatedNavbar;