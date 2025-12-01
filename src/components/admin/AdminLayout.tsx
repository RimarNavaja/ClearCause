import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  Building2,
  DollarSign,
  FileText,
  Settings,
  ShieldCheck,
  LineChart,
  LogOut,
  User,
  Loader2,
  Target,
  Activity,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { performCompleteLogout } from '@/utils/sessionManager';

interface AdminLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to} className="flex items-center gap-2">
          <span className="text-clearcause-primary">{icon}</span>
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ title = 'Dashboard', children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    setShowLogoutDialog(false);
    try {
      const result = await signOut();
      if (result.success) {
        toast({
          title: "Logged out successfully",
          description: "You have been signed out of your admin account.",
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
      console.error('Logout error:', error);
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

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="pt-4">
          <Link to="/" className="flex items-center gap-2 px-2">
            <img
              src="/logo.png"
              alt="ClearCause"
              className="h-8 w-auto"
            />
            <span className="text-xs text-muted-foreground">Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">Overview</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem to="/admin/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
              <NavItem to="/admin/activity" icon={<Activity className="h-4 w-4" />} label="Monitor Activity" />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">Verification</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem to="/admin/charity-verifications" icon={<ShieldCheck className="h-4 w-4" />} label="Charity Verifications" />
              <NavItem to="/admin/verifications" icon={<Target className="h-4 w-4" />} label="Milestone Proofs" />
              <NavItem to="/admin/payouts" icon={<DollarSign className="h-4 w-4" />} label="Fund Releases" />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">Management</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem to="/admin/users" icon={<UserCog className="h-4 w-4" />} label="User Management" />
              <NavItem to="/admin/charities" icon={<Building2 className="h-4 w-4" />} label="Charities" />
              <NavItem to="/admin/campaigns" icon={<LineChart className="h-4 w-4" />} label="Campaigns" />
              <NavItem to="/admin/donors" icon={<Users className="h-4 w-4" />} label="Donors" />
              <NavItem to="/admin/donations" icon={<DollarSign className="h-4 w-4" />} label="Donations" />
              <NavItem to="/admin/logs" icon={<FileText className="h-4 w-4" />} label="Audit Logs" />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Link to="/admin/settings">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-14 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold tracking-tight">
                <span className="text-clearcause-primary">{title}</span>
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden md:block w-64">
                <Input placeholder="Search…" className="h-8" />
              </div>
              <Link to={`/${user?.role || 'admin'}/settings`}>
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-clearcause-primary text-white rounded-full text-xs font-medium">
                      {(user?.fullName || user?.email || 'A')[0]?.toUpperCase()}
                    </div>
                    <div className="hidden sm:block leading-tight text-left">
                      <div className="text-xs font-medium">{user?.fullName || user?.email?.split('@')[0] || 'Admin'}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{user?.role || 'admin'}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.fullName || 'Admin User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/settings" className="w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/settings" className="w-full cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="w-full text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Page content */}
        <div className="p-6 bg-clearcause-background min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </SidebarInset>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your admin account? You will need to log in again to access the admin dashboard.
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
    </SidebarProvider>
  );
};

export default AdminLayout;
