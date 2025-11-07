import type { ChatMessage } from '../hooks/useWebSocket';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}
    </div>
  );
}
