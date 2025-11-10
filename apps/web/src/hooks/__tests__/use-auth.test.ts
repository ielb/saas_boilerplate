import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../use-auth';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/store/auth.store');
jest.mock('@/services/auth.service');
jest.mock('next/navigation');
jest.mock('sonner');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useAuth', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  };

  const mockStoreState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    setAuth: jest.fn(),
    clearAuth: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuthStore.mockReturnValue(mockStoreState as any);
    jest.clearAllMocks();
  });

  it('should return auth state and functions', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('register');
    expect(result.current).toHaveProperty('refresh');
  });

  it('should handle successful login', async () => {
    const mockLoginResponse = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CO_OWNER' as const,
        status: 'ACTIVE' as const,
        tenantId: 'tenant-1',
      },
    };

    mockAuthService.login.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockStoreState.setAuth).toHaveBeenCalledWith(mockLoginResponse);
      expect(mockToast.success).toHaveBeenCalledWith('Login successful');
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle login error', async () => {
    const error = new Error('Invalid credentials');
    mockAuthService.login.mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    await waitFor(() => {
      expect(mockStoreState.setError).toHaveBeenCalledWith('Invalid credentials');
      expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('should handle logout', async () => {
    mockAuthService.logout.mockResolvedValue({ success: true, message: 'Logged out' });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(mockStoreState.clearAuth).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });
});

