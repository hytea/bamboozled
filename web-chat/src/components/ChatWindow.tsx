import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../hooks/useWebSocket';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'message' | 'command') => void;
  isConnected: boolean;
  userName: string;
}

export function ChatWindow({ messages, onSendMessage, isConnected, userName }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bamboozled Puzzle Game</h1>
            <p className="text-sm text-gray-600">Playing as {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={!isConnected}
          placeholder="Type your guess or a command (/puzzle, /stats, /help)..."
        />
      </div>
    </div>
  );
}
