import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ChatWindow } from './components/ChatWindow';
import { UserSelector } from './components/UserSelector';

function App() {
  const [userName, setUserName] = useLocalStorage<string>('bamboozled-username', '');
  const [userId, setUserId] = useLocalStorage<string>('bamboozled-userid', '');
  const [isUserSet, setIsUserSet] = useState(!!userName && !!userId);

  const wsUrl = `ws://${window.location.hostname}:3001/ws`;

  const { messages, sendMessage, isConnected } = useWebSocket(
    wsUrl,
    userId || 'temp',
    userName || 'Guest'
  );

  const handleUserSelect = (name: string, id: string) => {
    setUserName(name);
    setUserId(id);
    setIsUserSet(true);
  };

  if (!isUserSet) {
    return <UserSelector onUserSelect={handleUserSelect} />;
  }

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
