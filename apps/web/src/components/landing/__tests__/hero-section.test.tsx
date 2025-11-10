import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroSection } from '../hero-section';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackButtonClick: jest.fn(),
}));

describe('HeroSection', () => {
  it('should render the hero section with title and description', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Build Your SaaS in/i)).toBeInTheDocument();
    expect(screen.getByText(/Weeks, Not Months/i)).toBeInTheDocument();
  });

  it('should render CTA buttons', () => {
    render(<HeroSection />);
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
    expect(screen.getByText('Watch Demo')).toBeInTheDocument();
  });
});

