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

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/',
})
@UseFilters(WsExceptionFilter)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) { }

  afterInit(server: Server): void {
    // ── Redis pub/sub adapter for Socket.io ────────────────────────────
    // Two dedicated connections are REQUIRED by the Redis protocol:
    //   pubClient  - used to PUBLISH events to the Redis channel
    //   subClient  - put into SUBSCRIBE mode; can run NO other commands
    // These are completely separate from the app's main REDIS_CLIENT so
    // presence queries, OTP lookups, and rate-limiting are never blocked.
    const redisOptions = {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      // Reconnect automatically on drop - critical for multi-instance prod
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    };

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions); // separate connection!

    pubClient.on('error', (err) =>
      this.logger.error('Socket.io Redis pubClient error', err),
    );
    subClient.on('error', (err) =>
      this.logger.error('Socket.io Redis subClient error', err),
    );

    server.adapter(createAdapter(pubClient, subClient));
    this.logger.log('Socket.io Redis pub/sub adapter attached');
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
    } catch {
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
    try {
      const room = await this.roomService.findById(roomId);
      const isMember = room.members.some((m) => m.toString() === client.userId);
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
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
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

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    await this.presenceService.heartbeat(client.userId);
    await this.userService.updateLastActive(client.userId);
  }
}
