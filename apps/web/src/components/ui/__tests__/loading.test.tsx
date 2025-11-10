import { render, screen } from '@testing-library/react';
import { Loading } from '../loading';

describe('Loading', () => {
  it('should render loading spinner', () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with text', () => {
    render(<Loading text='Loading...' />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { container, rerender } = render(<Loading size='sm' />);
    let spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<Loading size='md' />);
    spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-6', 'w-6');

    rerender(<Loading size='lg' />);
    spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });
});

