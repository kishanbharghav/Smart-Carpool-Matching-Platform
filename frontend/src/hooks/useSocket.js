import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(window.location.origin, { path: '/socket.io', transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  return socket;
}
