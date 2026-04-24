import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseFilters, Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from './presence.service';
import { MessageService } from '../message/message.service';
import { UserService } from '../user/user.service';
import { RoomService } from '../room/room.service';
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
}

interface SendMessagePayload {
  roomId: string;
  content: string;
  replyToId?: string;
}

interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

interface EditorUpdatePayload {
  roomId: string;
  content: string;
}

@WebSocketGateway({
  // Fix 4.1: restrict WS CORS to the same origin as the HTTP API.
  // Previously "origin: true" allowed any origin, including in production.
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
@UseFilters(WsExceptionFilter)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private editorClient: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) { }

  afterInit(): void {
    // ── Dedicated Redis client for shared editor ────────────────────────────
    // This is separate from the Socket.io adapter to ensure real-time editor
    // state is persisted and shared even if the pub/sub layer is busy.

    const redisUrl = process.env.REDIS_URL || '';
    const useTls = redisUrl.startsWith('rediss://');

    const redisOptions = {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      ...(useTls ? { tls: {} } : {}),
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    };

    this.editorClient = new Redis(redisOptions);
    this.editorClient.on('error', (err) =>
      this.logger.error('Editor Redis client error', err),
    );

    this.logger.log('ChatGateway initialized (Redis adapter handled globally)');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify<{ sub: string; email: string }>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) throw new Error('User not found');

      (client as AuthenticatedSocket).userId = user._id.toString();
      (client as AuthenticatedSocket).userName = user.name;

      await this.presenceService.setOnline(user._id.toString());
      await this.userService.updateLastActive(user._id.toString());
    } catch (err) {
      // Fix 2.3: log the actual error so we can distinguish auth failures
      // from DB outages, expired tokens, etc.
      this.logger.warn(
        `WS auth failed for socket ${client.id}: ${(err as Error).message}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = (client as AuthenticatedSocket).userId;
    if (!userId) return;

    await this.presenceService.setOffline(userId);

    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    for (const roomId of rooms) {
      await this.presenceService.leaveRoom(userId, roomId);
      this.server.to(roomId).emit('user_left', {
        userId,
        userName: (client as AuthenticatedSocket).userName,
        roomId,
        timestamp: new Date().toISOString(),
      });
      this.server.to(roomId).emit('presence_update', {
        roomId,
        onlineMembers: await this.presenceService.getRoomOnlineMembers(roomId),
      });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ): Promise<void> {
    const { roomId } = payload;
    // Fix 2.5: use the class logger instead of raw console.log
    this.logger.debug(`join_room attempt by ${client.userName} for room ${roomId}`);
    try {
      const room = await this.roomService.findById(roomId);
      // Fix 3.3: after populate(), members can be ObjectId OR UserDocument.
      // Use a type-safe check instead of casting to any.
      const isMember = room.members.some((m) => {
        const id = typeof m === 'object' && '_id' in (m as object)
          ? (m as { _id: { toString(): string } })._id
          : m;
        return id.toString() === client.userId;
      });
      if (!isMember) throw new WsException('Not a member of this room');

      await client.join(roomId);
      await this.presenceService.joinRoom(client.userId, roomId);

      client.to(roomId).emit('user_joined', {
        userId: client.userId,
        userName: client.userName,
        roomId,
        timestamp: new Date().toISOString(),
      });

      const onlineMembers = await this.presenceService.getRoomOnlineMembers(roomId);
      this.server.to(roomId).emit('presence_update', { roomId, onlineMembers });

      const history = await this.messageService.getRoomHistory(roomId);
      client.emit('room_history', { roomId, messages: history });

      const editorContent = await this.editorClient.get(`editor:${roomId}`);
      client.emit('editor_state', { roomId, content: editorContent ?? '' });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ): Promise<void> {
    const { roomId } = payload;
    // Fix 2.4: handleLeaveRoom previously had no error handling.
    // A Redis or DB failure here would throw an unhandled exception on the socket.
    try {
      await client.leave(roomId);
      await this.presenceService.leaveRoom(client.userId, roomId);

      client.to(roomId).emit('user_left', {
        userId: client.userId,
        userName: client.userName,
        roomId,
        timestamp: new Date().toISOString(),
      });

      const onlineMembers = await this.presenceService.getRoomOnlineMembers(roomId);
      this.server.to(roomId).emit('presence_update', { roomId, onlineMembers });
    } catch (err) {
      this.logger.error(
        `leave_room failed for ${client.userName} in room ${roomId}: ${(err as Error).message}`,
      );
      client.emit('error', { message: 'Failed to leave room. Please try again.' });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    // Fix 2.5: use the class logger instead of raw console.log
    this.logger.debug(`send_message from ${client.userName} in room ${payload.roomId}`);
    const { roomId, content, replyToId } = payload;
    if (!content?.trim()) return;

    try {
      const message = await this.messageService.create({
        roomId,
        senderId: client.userId,
        content,
        replyToId,
      });

      this.server.to(roomId).emit('new_message', { roomId, message });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ): void {
    const { roomId, isTyping } = payload;
    client.to(roomId).emit('user_typing', {
      userId: client.userId,
      userName: client.userName,
      roomId,
      isTyping,
    });
  }

  @SubscribeMessage('editor_update')
  async handleEditorUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: EditorUpdatePayload,
  ): Promise<void> {
    const { roomId, content } = payload;
    await this.editorClient.setex(`editor:${roomId}`, 86400, content);
    client.to(roomId).emit('editor_update', {
      roomId,
      content,
      updatedBy: client.userName,
    });
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    await this.presenceService.heartbeat(client.userId);
    await this.userService.updateLastActive(client.userId);
  }
}
