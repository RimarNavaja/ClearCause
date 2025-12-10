import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  CreditCard,
  Building2,
  ShieldCheck,
  Loader2,
  TrendingUp,
  Heart,
  PlusCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUserInitials, getUserDisplayName } from "@/utils/userHelpers";
import { useAuth } from "@/hooks/useAuth";
import { User as UserType } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { performCompleteLogout } from "@/utils/sessionManager";
import NotificationBell from "@/components/notifications/NotificationBell";

interface AuthenticatedNavbarProps {
  // No props needed as user will be fetched from useAuth
}

const AuthenticatedNavbar: React.FC<AuthenticatedNavbarProps> = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  if (!user) {
    // If user is not available, don't render the navbar
    return null;
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if link is active
  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  // Get link classes with active state
  const getLinkClasses = (path: string) => {
    const baseClasses =
      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-poppinsregular font-medium transition-colors";
    const activeClasses = "border-clearcause-primary text-clearcause-primary";
    const inactiveClasses =
      "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

    return `${baseClasses} ${
      isActiveLink(path) ? activeClasses : inactiveClasses
    }`;
  };

  // Get mobile link classes with active state
  const getMobileLinkClasses = (path: string) => {
    const baseClasses =
      "block pl-3 pr-4 py-2 text-base font-medium transition-colors";
    const activeClasses =
      "text-clearcause-primary bg-blue-50 border-l-4 border-clearcause-primary";
    const inactiveClasses =
      "text-gray-500 hover:text-gray-800 hover:bg-gray-50";

    return `${baseClasses} ${
      isActiveLink(path) ? activeClasses : inactiveClasses
    }`;
  };

  // Get role-specific dashboard link
  const getDashboardLink = (role: string) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "charity":
        return "/charity/dashboard";
      case "donor":
        return "/donor/dashboard";
      default:
        return "/";
    }
  };

  // Get role-based navigation links (shown in navbar)
  const getRoleBasedNavLinks = (role: string) => {
    switch (role) {
      case "donor":
        return [
          { to: "/donor/campaigns", label: "Browse Campaigns" },
          { to: "/donor/track-campaigns", label: "Track Impact" },
          { to: "/donor/donations", label: "My Donations" },
        ];
      case "charity":
        return [
          { to: "/campaigns", label: "Browse Campaigns" },
          { to: "/charity/campaigns", label: "My Campaigns" },
          { to: "/charity/dashboard", label: "Dashboard" },
        ];
      case "admin":
        return [
          { to: "/admin/verifications", label: "Verifications" },
          { to: "/admin/campaign-management", label: "Campaigns" },
          { to: "/admin/charity-management", label: "Charities" },
        ];
      default:
        return [
          { to: "/campaigns", label: "Browse Campaigns" },
          { to: "/how-it-works", label: "How It Works" },
        ];
    }
  };

  // Get role-specific dropdown menu items
  const getRoleSpecificNavItems = (role: string) => {
    switch (role) {
      case "donor":
        return [
          {
            to: "/donor/donations",
            label: "My Donations",
            icon: <CreditCard className="h-4 w-4" />,
          },
          {
            to: "/donor/track-campaigns",
            label: "Track Campaigns",
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            to: "/donor/profile",
            label: "Donor Profile",
            icon: <User className="h-4 w-4" />,
          },
        ];
      case "charity":
        return [
          {
            to: "/charity/campaigns",
            label: "My Campaigns",
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            to: "/charity/profile",
            label: "Organization Profile",
            icon: <Building2 className="h-4 w-4" />,
          },
        ];
      case "admin":
        return [
          {
            to: "/admin/verifications",
            label: "Verifications",
            icon: <ShieldCheck className="h-4 w-4" />,
          },
          {
            to: "/admin/charity-management",
            label: "Manage Charities",
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            to: "/admin/campaign-management",
            label: "Manage Campaigns",
            icon: <BarChart3 className="h-4 w-4" />,
          },
        ];
      default:
        return [];
    }
  };

  // Get role-specific quick action button
  const getQuickActionButton = (role: string) => {
    switch (role) {
      case "donor":
        return {
          to: "/donor/campaigns",
          label: "Donate Now",
          icon: <Heart className="h-4 w-4 mr-2" />,
          className:
            "bg-clearcause-primary hover:bg-clearcause-secondary text-white",
        };
      case "charity":
        return {
          to: "/charity/campaigns/new",
          label: "Create Campaign",
          icon: <PlusCircle className="h-4 w-4 mr-2" />,
          className:
            "bg-clearcause-primary hover:bg-clearcause-secondary text-white",
        };
      case "admin":
        return {
          to: "/admin/verifications",
          label: "Verifications",
          icon: <ShieldCheck className="h-4 w-4 mr-2" />,
          className:
            "bg-clearcause-primary hover:bg-clearcause-secondary text-white",
        };
      default:
        return null;
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
        await performCompleteLogout("/login");
      } else {
        toast({
          title: "Logout failed",
          description: result.error || "An error occurred during logout.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[AuthenticatedNavbar] Logout error:", error);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      // Force cleanup even on error
      await performCompleteLogout("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    setShowLogoutDialog(true);
  };

  const roleSpecificItems = getRoleSpecificNavItems(user.role);
  const navLinks = getRoleBasedNavLinks(user.role);
  const quickAction = getQuickActionButton(user.role);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                to={getDashboardLink(user.role)}
                className="flex items-center"
              >
                <img
                  src="/CLEARCAUSE-logo.svg"
                  alt="ClearCause"
                  className="h-[23px] w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation - Role-based */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link, index) => (
                <Link
                  key={index}
                  to={link.to}
                  className={getLinkClasses(link.to)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-clearcause-primary focus:ring-offset-2"
              >
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-full hover:bg-gray-50">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={user.avatarUrl || undefined}
                      alt={user.fullName || user.email}
                    />
                    <AvatarFallback className="bg-clearcause-primary text-white text-xs font-medium">
                      {getUserInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden lg:block font-poppinsregular">
                    {getUserDisplayName(user.fullName, user.email)}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50 font-poppinsregular">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-lg font-bold capitalize text-gray-900 font-robotobold">
                      {user.fullName || "User"}
                    </p>
                    <p className="text-sm text-gray-500 font-robotoregular">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">
                      {user.role} Account
                      {user.isVerified && (
                        <span className="text-blue-700 ml-1 font-poppinsregular">• Verified</span>
                      )}
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
          {/* Mobile Navigation Links */}
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.to}
                className={getMobileLinkClasses(link.to)}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 pb-4 border-t border-gray-200">
            {/* Mobile User Info */}
            <div className="px-4 mb-3">
              <div className="flex items-center">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={user.avatarUrl || undefined}
                    alt={user.fullName || user.email}
                  />
                  <AvatarFallback className="bg-clearcause-primary text-white text-sm font-medium">
                    {getUserInitials(user.fullName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {getUserDisplayName(user.fullName, user.email)}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            </div>

            {/* Mobile Menu Items */}
            <div className="px-4 space-y-2">
              {/* Quick Action Button */}
              {quickAction && (
                <Link
                  to={quickAction.to}
                  className="block w-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button className={`w-full ${quickAction.className}`}>
                    {quickAction.icon}
                    {quickAction.label}
                  </Button>
                </Link>
              )}

              {/* Dashboard Link */}
              <Link
                to={getDashboardLink(user.role)}
                className="block w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button variant="outline" className="w-full justify-start">
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
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon && <span className="mr-3">{item.icon}</span>}
                  {item.label}
                </Link>
              ))}

              <Link
                to={`/${user.role}/settings`}
                className="flex items-center px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
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
            <AlertDialogTitle>Confirm Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to sign out of your {user.role} account? You
              will need to log in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className=" gap-2">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="hover:bg-blue-600 px-6 border-2 border-gray-200 text-blue-700 shadow-sm hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 shadow-sm focus:ring-red-600 px-6"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>Sign out</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};

export default AuthenticatedNavbar;
