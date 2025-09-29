/**
 * Test Utilities
 * Custom render functions and test helpers
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock auth context values
export const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'donor' as const,
    isVerified: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  loading: false,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
};

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  authUser?: typeof mockAuthContext.user | null;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    withAuth = true,
    authUser = mockAuthContext.user,
    route = '/',
    ...renderOptions
  } = options;

  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Mock the auth hook if needed
  if (withAuth) {
    vi.doMock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        ...mockAuthContext,
        user: authUser,
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    }));
  }

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }: { children?: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {withAuth ? (
              <AuthProvider>{children}</AuthProvider>
            ) : (
              children
            )}
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Helper to wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// Helper to create mock functions with proper typing
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
) => {
  return vi.fn(implementation);
};

// Mock file object for file upload tests
export const createMockFile = (
  name: string = 'test-file.jpg',
  size: number = 1024,
  type: string = 'image/jpeg'
) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Helper to mock successful API responses
export const mockApiSuccess = <T>(data: T) => ({
  success: true,
  data,
  error: null,
});

// Helper to mock API errors
export const mockApiError = (message: string) => ({
  success: false,
  data: null,
  error: message,
});

// Custom matchers for common assertions
export const customMatchers = {
  toBeInTheDocument: expect.any(Function),
  toHaveClass: expect.any(Function),
  toBeVisible: expect.any(Function),
  toBeDisabled: expect.any(Function),
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';