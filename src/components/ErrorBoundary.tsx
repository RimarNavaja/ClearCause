/**
 * Error Boundary Component
 * Catches and handles React errors gracefully
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError, getErrorBoundaryFallback } from '../utils/errors';
import { reportAuthError, getAuthErrorSeverity } from '../utils/authErrorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Also report authentication-related errors
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('auth') || errorMessage.includes('session') || errorMessage.includes('token')) {
      reportAuthError(error, {
        context: 'error_boundary',
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.handleReset} />;
      }

      // Get error information
      const errorInfo = getErrorBoundaryFallback(this.state.error);
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {errorInfo.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {errorInfo.message}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {isDevelopment && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-40">
                    <div className="font-bold mb-2">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    <div className="mb-2">{this.state.error.stack}</div>
                    
                    {this.state.errorInfo && (
                      <>
                        <div className="font-bold mb-2">Component Stack:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}

              <div className="text-xs text-gray-500 text-center mt-4">
                If this problem persists, please contact support with the error code: {errorInfo.code}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of Error Boundary for functional components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    logError(error, errorInfo);
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.error('Handled error:', error);
    }

    // Report authentication errors
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('auth') || errorMessage.includes('session') || errorMessage.includes('token')) {
      reportAuthError(error, errorInfo);

      // For critical auth errors, consider redirecting to login
      const severity = getAuthErrorSeverity(error);
      if (severity === 'critical') {
        // This could trigger a logout or redirect
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    }
  }, []);

  return handleError;
};

/**
 * HOC version for wrapping components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
