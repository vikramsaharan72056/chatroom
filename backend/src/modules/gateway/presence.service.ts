import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

const ONLINE_TTL = 35; // seconds — heartbeat every 30s

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setOnline(userId: string): Promise<void> {
    await this.redis.set(`presence:${userId}`, 'online', 'EX', ONLINE_TTL);
  }

  async setOffline(userId: string): Promise<void> {
    await this.redis.del(`presence:${userId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.exists(`presence:${userId}`)) === 1;
  }

  async heartbeat(userId: string): Promise<void> {
    await this.redis.expire(`presence:${userId}`, ONLINE_TTL);
  }

  async getRoomOnlineUsers(userIds: string[]): Promise<Record<string, boolean>> {
    if (userIds.length === 0) return {};
    const pipeline = this.redis.pipeline();
    userIds.forEach((id) => pipeline.exists(`presence:${id}`));
    const results = await pipeline.exec();
    return userIds.reduce(
      (acc, id, i) => {
        acc[id] = results?.[i]?.[1] === 1;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  async joinRoom(userId: string, roomId: string): Promise<void> {
    await this.redis.sadd(`room:${roomId}:online`, userId);
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    await this.redis.srem(`room:${roomId}:online`, userId);
  }

  async getRoomOnlineCount(roomId: string): Promise<number> {
    return this.redis.scard(`room:${roomId}:online`);
  }

  async getRoomOnlineMembers(roomId: string): Promise<string[]> {
    return this.redis.smembers(`room:${roomId}:online`);
  }
}
