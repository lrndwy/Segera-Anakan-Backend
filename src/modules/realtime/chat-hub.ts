import { WebSocket } from 'ws';

type RoomSocket = WebSocket;

export type ChatMessage = {
  type: 'message' | 'system' | 'ping' | 'pong';
  roomId: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp: string;
};

export class ChatHub {
  private readonly rooms = new Map<string, Set<RoomSocket>>();

  join(roomId: string, socket: RoomSocket) {
    const room = this.rooms.get(roomId) ?? new Set<RoomSocket>();
    room.add(socket);
    this.rooms.set(roomId, room);
  }

  leave(roomId: string, socket: RoomSocket) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    room.delete(socket);

    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  broadcast(roomId: string, payload: ChatMessage) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    const serialized = JSON.stringify(payload);

    for (const socket of room) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    }
  }

  roomSize(roomId: string) {
    return this.rooms.get(roomId)?.size ?? 0;
  }
}
