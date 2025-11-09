import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
  userId?: string;
  metadata?: {
    imageUrl?: string;
    gifUrl?: string;
    isCommand?: boolean;
    moodTier?: number;
  };
}

export function useWebSocket(url: string, userId: string, userName: string, onUserIdReceived?: (userId: string) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onUserIdReceivedRef = useRef(onUserIdReceived);
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);

  useEffect(() => {
    onUserIdReceivedRef.current = onUserIdReceived;
  }, [onUserIdReceived]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  const connect = useCallback(() => {
    // Don't create a new connection if one already exists and is open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send init message (server will create/find user by userName and send back userId)
      ws.send(
        JSON.stringify({
          type: 'init',
          userName: userNameRef.current
        })
      );
    };

    ws.onmessage = (event) => {
      const message: ChatMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);

      // If server sends back a userId, update it immediately and notify parent
      if (message.userId) {
        // Update the ref immediately so subsequent messages use the correct userId
        userIdRef.current = message.userId;

        // Also notify the parent component to update its state
        if (onUserIdReceivedRef.current) {
          onUserIdReceivedRef.current(message.userId);
        }
      }
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
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
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
            userId: userIdRef.current
          })
        );
      }
    },
    []
  );

  return {
    messages,
    sendMessage,
    isConnected
  };
}
