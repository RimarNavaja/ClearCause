
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import AuthenticatedNavbar from './AuthenticatedNavbar';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  // Show loading skeleton while auth is loading
  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-display font-bold text-clearcause-primary">
                  Clear<span className="text-clearcause-accent">Cause</span>
                </span>
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
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-display font-bold text-clearcause-primary">
                  Clear<span className="text-clearcause-accent">Cause</span>
                </span>
              </Link>
            </div>
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
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
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
            <Link to="/login">
              <Button variant="outline" className="text-clearcause-primary hover:text-clearcause-primary border-clearcause-primary hover:border-clearcause-primary">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90">
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
            <div className="px-4 space-y-3">
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
              <Link to="/login" className="block w-full">
                <Button variant="outline" className="w-full text-clearcause-primary hover:text-clearcause-primary border-clearcause-primary hover:border-clearcause-primary">
                  Log In
                </Button>
              </Link>
              <Link to="/signup" className="block w-full">
                <Button className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90">
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
