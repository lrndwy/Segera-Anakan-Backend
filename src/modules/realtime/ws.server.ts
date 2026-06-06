import type { IncomingMessage } from 'node:http';

import type { ServerType } from '@hono/node-server';
import { WebSocket, WebSocketServer } from 'ws';

import { env, logger } from '../../config';
import { ChatHub, type ChatMessage } from './chat-hub';

type SocketWithRoom = WebSocket & {
  roomId?: string;
};

export const attachRealtimeWebSocketServer = (server: ServerType, chatHub: ChatHub) => {
  const webSocketServer = new WebSocketServer({ noServer: true });
  const httpServer = server as unknown as {
    on: (eventName: 'upgrade', listener: (request: IncomingMessage, socket: import('node:net').Socket, head: Buffer) => void) => void;
  };

  httpServer.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (!requestUrl.pathname.startsWith(`${env.API_PREFIX}/realtime/ws/`)) {
      return;
    }

    const roomId = decodeURIComponent(requestUrl.pathname.slice(`${env.API_PREFIX}/realtime/ws/`.length).split('/')[0] ?? '');

    if (!roomId) {
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      (webSocket as SocketWithRoom).roomId = roomId;
      webSocketServer.emit('connection', webSocket, request);
    });
  });

  webSocketServer.on('connection', (socket: WebSocket) => {
    const socketWithRoom = socket as SocketWithRoom;
    const roomId = socketWithRoom.roomId ?? 'default';

    chatHub.join(roomId, socket);
    socket.send(
      JSON.stringify({
        type: 'system',
        roomId,
        message: 'Connected to realtime room',
        timestamp: new Date().toISOString(),
      } satisfies ChatMessage),
    );

    socket.on('message', (data) => {
      try {
        const rawMessage = typeof data === 'string' ? data : data.toString('utf8');
        const parsed = rawMessage ? (JSON.parse(rawMessage) as Partial<{ message: string; senderId: string; senderName: string; type: string }>) : {};

        if (parsed.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', roomId, timestamp: new Date().toISOString() } satisfies ChatMessage));
          return;
        }

        chatHub.broadcast(roomId, {
          type: 'message',
          roomId,
          ...(parsed.senderId ? { senderId: parsed.senderId } : {}),
          ...(parsed.senderName ? { senderName: parsed.senderName } : {}),
          message: parsed.message ?? rawMessage,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.warn({ error, roomId }, 'invalid websocket payload');
        socket.send(JSON.stringify({ type: 'system', roomId, message: 'Invalid JSON payload', timestamp: new Date().toISOString() } satisfies ChatMessage));
      }
    });

    socket.on('close', () => {
      chatHub.leave(roomId, socket);
      chatHub.broadcast(roomId, {
        type: 'system',
        roomId,
        message: 'A user left the room',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('error', (error) => {
      logger.error({ error, roomId }, 'websocket error');
    });
  });

  return webSocketServer;
};
