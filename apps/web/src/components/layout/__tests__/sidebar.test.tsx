import { render, screen } from '@testing-library/react';
import { Sidebar } from '../sidebar';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('should render sidebar with navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('should highlight active route', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users');
    render(<Sidebar />);
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).toHaveClass('bg-primary');
  });
});


