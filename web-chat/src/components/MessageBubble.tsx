import type { ChatMessage } from '../hooks/useWebSocket';
import { Bot, User, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isBot = message.type === 'bot';
  const isError = message.type === 'error';
  const moodTier = message.metadata?.moodTier ?? 0;

  // Mood tier colors
  const moodColors = [
    'text-gray-600', // Tier 0: Skeptic
    'text-gray-500', // Tier 1: Indifferent
    'text-blue-600', // Tier 2: Acknowledger
    'text-green-600', // Tier 3: Respector
    'text-purple-600', // Tier 4: Admirer
    'text-yellow-600', // Tier 5: Devotee
    'text-pink-600' // Tier 6: Worshipper
  ];

  const moodColor = moodColors[Math.min(moodTier, 6)];

  return (
    <div className={`flex ${isBot || isError ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[80%] gap-3 ${isBot || isError ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isError
              ? 'bg-red-100 text-red-600'
              : isBot
                ? `bg-blue-100 ${moodColor}`
                : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isError ? <AlertCircle size={18} /> : isBot ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-2">
          <div
            className={`rounded-lg px-4 py-2 ${
              isError
                ? 'border border-red-200 bg-red-50 text-red-800'
                : isBot
                  ? 'bg-white shadow-sm'
                  : 'bg-blue-600 text-white'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

            {/* Image if present */}
            {message.metadata?.imageUrl && (
              <img
                src={message.metadata.imageUrl}
                alt="Puzzle"
                className="mt-2 max-w-full rounded-md"
              />
            )}

            {/* GIF if present */}
            {message.metadata?.gifUrl && (
              <img
                src={message.metadata.gifUrl}
                alt="Celebration"
                className="mt-2 max-w-full rounded-md"
              />
            )}
          </div>

          {/* Timestamp */}
          <span className={`text-xs text-gray-400 ${isBot ? 'text-left' : 'text-right'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
