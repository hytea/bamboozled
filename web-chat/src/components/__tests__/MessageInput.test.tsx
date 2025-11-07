import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../MessageInput';

describe('MessageInput', () => {
  it('should render input and send button', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="" onChange={mockOnChange} onSend={mockOnSend} />);

    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onChange when input value changes', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="" onChange={mockOnChange} onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Test message' } });

    expect(mockOnChange).toHaveBeenCalledWith('Test message');
  });

  it('should call onSend when send button is clicked', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="Test message" onChange={mockOnChange} onSend={mockOnSend} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('should disable send button when value is empty', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="" onChange={mockOnChange} onSend={mockOnSend} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should disable send button when value is only whitespace', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="   " onChange={mockOnChange} onSend={mockOnSend} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="" onChange={mockOnChange} onSend={mockOnSend} disabled={true} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    expect(input).toBeDisabled();
  });

  it('should handle Enter key press', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="Test message" onChange={mockOnChange} onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('should not send on Shift+Enter', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="Test message" onChange={mockOnChange} onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should use custom placeholder when provided', () => {
    const mockOnChange = vi.fn();
    const mockOnSend = vi.fn();
    render(<MessageInput value="" onChange={mockOnChange} onSend={mockOnSend} placeholder="Custom placeholder" />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });
});
