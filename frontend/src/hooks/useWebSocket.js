import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const useWebSocket = (namespace = '') => {
  const socket = useRef(null);

  useEffect(() => {
    // Connect to WebSocket server
    socket.current = io(SOCKET_URL + namespace, {
      transports: ['websocket'],
    });

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [namespace]);

  const subscribe = useCallback((event, callback) => {
    if (socket.current) {
      socket.current.on(event, callback);
    }
  }, []);

  const unsubscribe = useCallback((event) => {
    if (socket.current) {
      socket.current.off(event);
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socket.current) {
      socket.current.emit(event, data);
    }
  }, []);

  return {
    socket: socket.current,
    subscribe,
    unsubscribe,
    emit,
  };
};

export default useWebSocket; 