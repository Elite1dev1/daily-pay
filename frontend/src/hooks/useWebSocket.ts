import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

export function useWebSocket(room?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (room) {
        socket.emit('join:dashboard');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('dashboard:update', (data) => {
      setLastUpdate(data);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      if (room) {
        socket.emit('leave:dashboard');
      }
      socket.disconnect();
    };
  }, [token, room]);

  return {
    isConnected,
    lastUpdate,
    socket: socketRef.current,
  };
}
