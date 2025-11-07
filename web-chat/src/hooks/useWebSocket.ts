import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
  metadata?: {
    imageUrl?: string;
    gifUrl?: string;
    isCommand?: boolean;
    moodTier?: number;
  };
}

export function useWebSocket(url: string, userId: string, userName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // Don't create a new connection if one already exists and is open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send init message
      ws.send(
        JSON.stringify({
          type: 'init',
          userId,
          userName
        })
      );
    };

    ws.onmessage = (event) => {
      const message: ChatMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);

      // Only reconnect if it wasn't a clean close
      if (event.code !== 1000 && wsRef.current === ws) {
        console.log('Reconnecting in 3 seconds...');
        setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, [url, userId, userName]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string, type: 'message' | 'command' = 'message') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Add user message to UI immediately
        if (type === 'message' || type === 'command') {
          setMessages((prev) => [
            ...prev,
            {
              type: 'user',
              content,
              timestamp: new Date().toISOString()
            }
          ]);
        }

        // Send to server
        wsRef.current.send(
          JSON.stringify({
            type: content.startsWith('/') ? 'command' : type,
            content,
            userId
          })
        );
      }
    },
    [userId]
  );

  return {
    messages,
    sendMessage,
    isConnected
  };
}
