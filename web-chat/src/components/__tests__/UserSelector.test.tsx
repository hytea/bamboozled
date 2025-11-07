import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserSelector } from '../UserSelector';

describe('UserSelector', () => {
  it('should render the component', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    expect(screen.getByText('Bamboozled')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start playing/i })).toBeInTheDocument();
  });

  it('should have submit button disabled when name is empty', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    const submitButton = screen.getByRole('button', { name: /start playing/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when name is entered', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Test User' } });

    const submitButton = screen.getByRole('button', { name: /start playing/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onUserSelect with trimmed name when form is submitted', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: '  Test User  ' } });

    const form = screen.getByRole('button', { name: /start playing/i }).closest('form');
    fireEvent.submit(form!);

    expect(mockOnUserSelect).toHaveBeenCalledTimes(1);
    expect(mockOnUserSelect).toHaveBeenCalledWith('Test User', expect.any(String));
  });

  it('should not call onUserSelect when name is only whitespace', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: '   ' } });

    const form = screen.getByRole('button', { name: /start playing/i }).closest('form');
    fireEvent.submit(form!);

    expect(mockOnUserSelect).not.toHaveBeenCalled();
  });

  it('should display instructions text', () => {
    const mockOnUserSelect = vi.fn();
    render(<UserSelector onUserSelect={mockOnUserSelect} />);

    expect(screen.getByText(/Type your guess or use commands/i)).toBeInTheDocument();
  });
});
