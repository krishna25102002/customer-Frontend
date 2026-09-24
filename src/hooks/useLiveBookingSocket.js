import { useCallback, useEffect, useRef, useState } from 'react';

import { getSocket } from '../socket';

export const SOCKET_CONNECTED = 'connected';
export const SOCKET_RECONNECTING = 'reconnecting';
export const SOCKET_DISCONNECTED = 'disconnected';

// Real-time bridge to the booking-specific Socket.IO room `booking:<id>`.
// - connects the shared socket with the stored JWT
// - subscribes/unsubscribes to the room (backend re-validates ownership)
// - `sendLocation(position)` emits the role-appropriate location event
// - surfaces connection state for the UI (reconnecting, offline, etc.)
export default function useLiveBookingSocket({
  bookingId = null,
  role = 'driver', // 'driver' | 'customer'
  enabled = true,
  onEnded = null,
  onTrackingState = null,
  onDriverLocation = null,
  onCustomerLocation = null,
} = {}) {
  const [connection, setConnection] = useState('idle'); // idle|connected|reconnecting|disconnected
  const [lastError, setLastError] = useState(null);

  const socketRef = useRef(null);
  const bookingIdRef = useRef(bookingId);
  bookingIdRef.current = bookingId;

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onTrackingStateRef = useRef(onTrackingState);
  onTrackingStateRef.current = onTrackingState;
  const onDriverLocationRef = useRef(onDriverLocation);
  onDriverLocationRef.current = onDriverLocation;
  const onCustomerLocationRef = useRef(onCustomerLocation);
  onCustomerLocationRef.current = onCustomerLocation;

  useEffect(() => {
    if (!enabled || !bookingId) return;

    let alive = true;
    let socket = null;
    let subscribed = false;

    const subscribe = () => {
      if (!alive || subscribed || !socket || !socket.connected) return;
      subscribed = true;
      socket.emit('booking:subscribe', { bookingId: bookingIdRef.current });
    };

    const unsubscribe = () => {
      if (!alive || !socket || !socket.connected || !subscribed) return;
      subscribed = false;
      socket.emit('booking:unsubscribe', { bookingId: bookingIdRef.current });
    };

    const mount = async () => {
      try {
        socket = await getSocket();
        if (!alive || !socket) return;
        socketRef.current = socket;

        socket.on('connect', () => {
          if (!alive) return;
          setConnection(SOCKET_CONNECTED);
          setLastError(null);
          subscribed = false;
          subscribe();
        });
        socket.on('disconnect', () => {
          if (!alive) return;
          setConnection(SOCKET_DISCONNECTED);
          subscribed = false;
        });
        socket.on('reconnect_attempt', () => {
          if (alive) setConnection(SOCKET_RECONNECTING);
        });
        socket.on('location:error', payload => {
          if (!alive) return;
          setLastError(payload);
          if (payload && payload.code === 'BOOKING_NOT_ACTIVE' && onEndedRef.current) {
            onEndedRef.current({ reason: 'inactive' });
          }
        });
        socket.on('booking:ended', payload => {
          if (!alive) return;
          if (onEndedRef.current) onEndedRef.current(payload || { reason: 'cancelled' });
        });
        socket.on('tracking:state', payload => {
          if (!alive) return;
          if (onTrackingStateRef.current) onTrackingStateRef.current(payload || {});
        });
        socket.on('location:updated', payload => {
          if (!alive || !payload) return;
          if (payload.role === 'driver' && onDriverLocationRef.current) {
            onDriverLocationRef.current(payload);
          }
          if (payload.role === 'customer' && onCustomerLocationRef.current) {
            onCustomerLocationRef.current(payload);
          }
        });

        if (socket.connected) {
          setConnection(SOCKET_CONNECTED);
          subscribe();
        } else {
          socket.connect();
        }
      } catch (err) {
        if (alive) {
          setConnection(SOCKET_DISCONNECTED);
          setLastError({ code: 'SOCKET_FAILED', message: 'Could not connect to server' });
        }
      }
    };

    mount();

    return () => {
      alive = false;
      unsubscribe();
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect_attempt');
        socket.off('location:error');
        socket.off('booking:ended');
        socket.off('tracking:state');
        socket.off('location:updated');
      }
    };
  }, [enabled, bookingId]);

  const sendLocation = useCallback(
    position => {
      const socket = socketRef.current;
      if (!socket || !socket.connected || !bookingIdRef.current || !position) return false;
      socket.emit(role === 'customer' ? 'customer:location:update' : 'driver:location:update', {
        bookingId: bookingIdRef.current,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy || 0,
        heading: position.heading || 0,
        speed: position.speed || 0,
        timestamp: position.timestamp || new Date().toISOString(),
      });
      return true;
    },
    [role]
  );

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !bookingIdRef.current) return;
    socket.emit('booking:unsubscribe', { bookingId: bookingIdRef.current });
  }, []);

  return { connection, lastError, sendLocation, leaveRoom };
}