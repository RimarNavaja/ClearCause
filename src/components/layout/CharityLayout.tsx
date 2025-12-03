import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  BadgeCheck,
  DollarSign,
  Landmark,
  LogOut,
  Bell,
  User,
  Loader2,
  PlusCircle,
  Target,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
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
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { performCompleteLogout } from "@/utils/sessionManager";

interface CharityLayoutProps {
  children: React.ReactNode;
  title: string;
}

const CharityLayout: React.FC<CharityLayoutProps> = ({ children, title }) => {
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
          description: "You have been signed out of your charity account.",
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
      console.error("[CharityLayout] Logout error:", error);
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
    setShowLogoutDialog(true);
  };

  const navItems = [
    {
      path: "/charity/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      path: "/charity/campaigns/new",
      label: "Create New Campaign",
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      path: "/charity/campaigns",
      label: "Manage Campaigns",
      icon: <ListChecks className="w-5 h-5" />,
    },
    {
      path: "/charity/milestones",
      label: "Milestones",
      icon: <Target className="w-5 h-5" />,
    },
    {
      path: "/charity/analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      path: "/charity/funds",
      label: "Funds Management",
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      path: "/charity/profile",
      label: "Organization Profile",
      icon: <Landmark className="w-5 h-5" />,
    },
    {
      path: "/charity/settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex-grow flex bg-clearcause-background">
        {/* Sidebar - Fixed to left */}
        <aside className="bg-white w-64 min-h-[calc(100vh-4rem)] shadow-sm fixed left-0 top-16">
          <div className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Charity Portal
            </h2>

            <div className="flex flex-col space-y-2 flex-grow">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2 rounded-md text-sm font-medium
                    ${
                      isActive
                        ? "bg-clearcause-primary/10 text-clearcause-primary"
                        : "text-gray-600 hover:text-clearcause-primary hover:bg-gray-100"
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
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mt-auto w-full text-left transition-colors ${
                  isLoggingOut || authLoading
                    ? "text-gray-400 cursor-not-allowed bg-gray-100"
                    : "text-gray-600 hover:text-red-500 hover:bg-red-50"
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

        {/* Main content - With left margin to account for sidebar */}
        <main className="flex-grow p-8">
          <div className="max-w-7xl mx-auto px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>
      <Footer />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to sign out of your{" "}
              <span className="font-semibold">Charity</span> account? You will
              need to log in again to access your dashboard.
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
    </div>
  );
};

export default CharityLayout;
