import { useEffect, useRef, useCallback } from 'react';
import { setupSignaling } from '../utils/signaling';

const SIGNAL_SERVER = 'ws://localhost:3000';
const RECONNECT_DELAY = 3000;

interface UseWebRTCProps {
  role: 'sender' | 'receiver';
  file: File | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function useWebRTC({ role, file, videoRef }: UseWebRTCProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const socket = new WebSocket(SIGNAL_SERVER);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        const cleanup = setupSignaling(socket, {
          role,
          file,
          videoRef,
          send: (data) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(data));
            }
          },
        });
        cleanupRef.current = cleanup;
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        cleanupRef.current?.();
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [role, file, videoRef]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      cleanupRef.current?.();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
}
