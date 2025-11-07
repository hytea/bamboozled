import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN
};

vi.stubGlobal('WebSocket', vi.fn(() => mockWebSocket));

describe('Integration: Complete Chat Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should allow user to enter name and connect to chat', async () => {
    render(<App />);

    // User should see name input screen
    expect(screen.getByText('Bamboozled')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();

    // Enter name
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    // Submit name
    const submitButton = screen.getByRole('button', { name: /start playing/i });
    fireEvent.click(submitButton);

    // Should attempt to connect to WebSocket
    await waitFor(() => {
      expect(WebSocket).toHaveBeenCalled();
    });
  });

  it('should persist user information in localStorage', () => {
    render(<App />);

    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });

    const submitButton = screen.getByRole('button', { name: /start playing/i });
    fireEvent.click(submitButton);

    // Check localStorage
    const storedUser = localStorage.getItem('bamboozled-user');
    expect(storedUser).toBeTruthy();
    const parsedUser = JSON.parse(storedUser!);
    expect(parsedUser.name).toBe('Test User');
    expect(parsedUser.id).toBeTruthy();
  });

  it('should restore user from localStorage on reload', () => {
    // Set up localStorage with existing user
    const existingUser = {
      name: 'Existing User',
      id: 'existing-user-id'
    };
    localStorage.setItem('bamboozled-user', JSON.stringify(existingUser));

    render(<App />);

    // Should skip name selection and go directly to chat
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument();
  });

  it('should handle WebSocket connection lifecycle', async () => {
    render(<App />);

    // Enter name and connect
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    const submitButton = screen.getByRole('button', { name: /start playing/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(WebSocket).toHaveBeenCalled();
    });

    // WebSocket should have event listeners attached
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
