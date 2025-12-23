import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  Star,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
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
  const [open, setOpen] = useState(true);

  // Handle responsive sidebar state (collapse at 1800px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1800) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const navGroups = [
    {
      label: "Overview",
      items: [
        {
          path: "/charity/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
      ],
    },
    {
      label: "Campaign Management",
      items: [
        {
          path: "/charity/campaigns/new",
          label: "Create New Campaign",
          icon: <PlusCircle className="h-5 w-5" />,
        },
        {
          path: "/charity/campaigns",
          label: "Manage Campaigns",
          icon: <ListChecks className="h-5 w-5" />,
        },
        {
          path: "/charity/milestones",
          label: "Milestones",
          icon: <Target className="h-5 w-5" />,
        },
      ],
    },
    {
      label: "Finance & Analytics",
      items: [
        {
          path: "/charity/funds",
          label: "Funds Management",
          icon: <DollarSign className="h-5 w-5" />,
        },
        {
          path: "/charity/analytics",
          label: "Analytics",
          icon: <BarChart3 className="h-5 w-5" />,
        },
      ],
    },
    {
      label: "Organization",
      items: [
        {
          path: "/charity/profile",
          label: "Organization Profile",
          icon: <Landmark className="h-5 w-5" />,
        },
        {
          path: "/charity/received-feedback",
          label: "Received Feedback",
          icon: <Star className="h-5 w-5" />,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex-grow flex bg-clearcause-background relative">
        <SidebarProvider open={open} onOpenChange={setOpen} className="w-full font-poppinsregular">
          <Sidebar
            collapsible="icon"
            className="top-16 h-[calc(100vh-4rem)] border-r bg-white"
          >
            <SidebarHeader className="flex flex-row items-center justify-between p-4 pt-6">
              {open && (
                <h2 className="text-xl font-semibold text-gray-900 font-robotobold truncate">
                  Charity Portal
                </h2>
              )}
              <SidebarTrigger className="ml-auto hover:bg-blue-600" />
            </SidebarHeader>
            <SidebarContent>
              {navGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs text-muted-foreground">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        let isActive =
                          location.pathname === item.path ||
                          location.pathname.startsWith(`${item.path}/`);

                        // Special case: "Manage Campaigns" should not be active if we are on "Create New Campaign"
                        if (
                          item.path === "/charity/campaigns" &&
                          location.pathname === "/charity/campaigns/new"
                        ) {
                          isActive = false;
                        }
                        
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={
                                isActive
                                  ? "!bg-blue-100 !text-blue-600 hover:bg-blue-200"
                                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                              }
                            >
                              <Link to={item.path}>
                                {item.icon}
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                </div>
              ))}

              <div className="mt-auto px-2 pb-4">
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs text-muted-foreground">
                    Account
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === "/charity/settings"}
                        tooltip="Settings"
                        className={
                          location.pathname === "/charity/settings"
                            ? "!bg-blue-100 !text-blue-600 hover:bg-blue-200"
                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        }
                      >
                        <Link to="/charity/settings">
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={handleLogoutClick}
                        disabled={isLoggingOut || authLoading}
                        tooltip="Logout"
                        className={`
                          ${
                            isLoggingOut || authLoading
                              ? "text-gray-400 cursor-not-allowed hover:bg-transparent"
                              : "text-gray-600 hover:text-red-500 hover:bg-red-50"
                          }
                        `}
                      >
                        {isLoggingOut || authLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <LogOut className="h-5 w-5" />
                        )}
                        <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </div>
            </SidebarContent>
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] bg-clearcause-background">
            <main className="flex-grow p-8 lg:pl-20">
              <div className={cn("max-w-7xl px-4 sm:px-6 lg:px-4 lg:pr-10 font-poppinsregular", {
                "mx-auto": !open
              })}>
                <h1 className="text-3xl font-bold text-gray-900 mb-6 font-robotobold">
                  {title}
                </h1>
                {children}
              </div>
            </main>
            <Footer />
          </SidebarInset>
        </SidebarProvider>
      </div>

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
