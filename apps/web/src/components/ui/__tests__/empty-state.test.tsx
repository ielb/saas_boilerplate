import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';
import { Button } from '../button';

describe('EmptyState', () => {
  it('should render empty state with title', () => {
    render(<EmptyState title='No data found' />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(<EmptyState title='No data' description='Try again later' />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('should render with action button', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState
        title='No data'
        action={{ label: 'Create New', onClick: handleClick }}
      />
    );
    const button = screen.getByText('Create New');
    expect(button).toBeInTheDocument();
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});


