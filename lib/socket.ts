'use client';

import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, Channel } from './types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
            autoConnect: false,
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
}

export function connectSocket(): TypedSocket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

export function subscribeToTasks(): void {
    const s = getSocket();
    s.emit('task:subscribe');
}

export function joinChatChannel(channel: Channel): void {
    const s = getSocket();
    s.emit('chat:join', channel);
}

export function leaveChatChannel(channel: Channel): void {
    const s = getSocket();
    s.emit('chat:leave', channel);
}

export function emitTyping(channel: Channel): void {
    const s = getSocket();
    s.emit('chat:typing', channel);
}

export function emitRead(messageId: string): void {
    const s = getSocket();
    s.emit('chat:read', messageId);
}
