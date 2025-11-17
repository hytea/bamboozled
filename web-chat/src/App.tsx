import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ChatWindow } from './components/ChatWindow';

function App() {
  const [userName, setUserName] = useLocalStorage<string>('bamboozled-username', '');

  // Use plain localStorage for userId (not JSON-encoded) for test compatibility
  const [userId, setUserId] = useState<string>(() => {
    const stored = localStorage.getItem('userId');
    if (stored && stored !== 'temp') {
      return stored;
    }
    const newUserId = crypto.randomUUID();
    localStorage.setItem('userId', newUserId);
    return newUserId;
  });

  // Re-check localStorage periodically in case it was cleared
  useEffect(() => {
    const checkUserId = () => {
      const stored = localStorage.getItem('userId');
      if (!stored || stored === 'temp') {
        const newUserId = crypto.randomUUID();
        setUserId(newUserId);
        localStorage.setItem('userId', newUserId);
      } else if (stored !== userId) {
        setUserId(stored);
      }
    };

    // Check every 100ms to catch localStorage clears quickly
    const interval = setInterval(checkUserId, 100);
    return () => clearInterval(interval);
  }, [userId]);

  // Set default username if none exists
  useEffect(() => {
    if (!userName) {
      setUserName('Guest');
    }
  }, [userName, setUserName]);

  // Use window.location.host to get hostname:port, so it works both in dev and Docker
  // In dev: ws://localhost:5173/ws (Vite proxies to backend)
  // In Docker: ws://localhost:3000/ws (Nginx proxies to backend)
  const wsUrl = `ws://${window.location.host}/ws`;

  const { messages, sendMessage, isConnected } = useWebSocket(
    wsUrl,
    userId || 'temp',
    userName || 'Guest',
    (newUserId) => {
      if (newUserId !== userId) {
        setUserId(newUserId);
        localStorage.setItem('userId', newUserId);
      }
    }
  );

  return (
    <div className="h-screen w-screen bg-background">
      <ChatWindow
        messages={messages}
        onSendMessage={sendMessage}
        isConnected={isConnected}
        userName={userName}
      />
    </div>
  );
}

export default App;
