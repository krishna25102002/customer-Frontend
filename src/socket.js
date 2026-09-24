import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SOCKET_BASE_URL } from './api';

// Single shared socket. Every connection authenticates with the stored JWT via
// the handshake `auth` field — the backend derives identity from that token,
// never from event payloads. Mirrors the driver app's socket module.
let socket = null;

export async function getSocket() {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;

  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });
  } else {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function getConnectedSocket() {
  return socket && socket.connected ? socket : null;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export const isSocketConnected = () => socket != null && socket.connected;