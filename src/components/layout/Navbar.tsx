import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedNavbar from "./AuthenticatedNavbar";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, authError } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const location = useLocation();

  // Add timeout protection for navbar loading
  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn("[Navbar] Loading timeout - forcing navbar to show");
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout for navbar

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Check if link is active
  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  // Get link classes with active state
  const getLinkClasses = (path: string) => {
    const baseClasses =
      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors";
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

  // Show loading skeleton while auth is loading (with timeout protection)
  if (loading && !authError && !loadingTimeout) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src="/logo.png" alt="ClearCause" className="h-8 w-auto" />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // If user is authenticated, use the authenticated navbar
  if (user) {
    return <AuthenticatedNavbar user={user} />;
  }

  // Otherwise, show the public navbar

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex font-poppinsregular font-medium ">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <img
                  src="/CLEARCAUSE-logo.svg"
                  alt="ClearCause"
                  className="h-[23px] w-auto "
                />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/campaigns" className={getLinkClasses("/campaigns")}>
                Browse Campaigns
              </Link>
              <Link
                to="/how-it-works"
                className={getLinkClasses("/how-it-works")}
              >
                How It Works
              </Link>
              <Link to="/about" className={getLinkClasses("/about")}>
                About Us
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-3">
            <Link to="/login">
              <Button className="bg-clearcause-primary hover:text-white hover:bg-blue-700 rounded-full px-10 font-redhatbold text-xs">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-clearcause-primary hover:bg-blue-700 rounded-full  px-10 font-redhatbold text-xs">
                Sign Up
              </Button>
            </Link>
          </div>
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

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/campaigns"
              className={getMobileLinkClasses("/campaigns")}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Campaigns
            </Link>
            <Link
              to="/how-it-works"
              className={getMobileLinkClasses("/how-it-works")}
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              to="/about"
              className={getMobileLinkClasses("/about")}
              onClick={() => setIsMenuOpen(false)}
            >
              About Us
            </Link>
          </div>
          <div className="pt-3 pb-4 border-t border-gray-200">
            <div className="px-4 space-y-2">
              <Link
                to="/login"
                className="block w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button variant="outline" className="w-full">
                  Log In
                </Button>
              </Link>
              <Link
                to="/signup"
                className="block w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button className="w-full bg-clearcause-primary hover:bg-clearcause-secondary">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
