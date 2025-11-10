import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';
import { useAuth } from '@/hooks/use-auth';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('LoginForm', () => {
  const mockLogin = jest.fn();
  const mockOnMfaRequired = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      checkAuth: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();
    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'short');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ requiresMfa: false });

    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        false
      );
    });
  });

  it('should handle MFA requirement', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ requiresMfa: true, userId: 'user-123' });

    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnMfaRequired).toHaveBeenCalledWith('user-123');
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<LoginForm onMfaRequired={mockOnMfaRequired} />);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});

