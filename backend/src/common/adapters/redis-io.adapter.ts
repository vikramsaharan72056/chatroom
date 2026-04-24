import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD;
    const url = process.env.REDIS_URL || (password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`);

    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();

    // Fix 5.2: wrap in try/catch so bootstrap().catch() receives a clear error
    // instead of an unhandled rejection with a cryptic Redis stack trace.
    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
    } catch (err) {
      throw new Error(
        `RedisIoAdapter: failed to connect to Redis at ${url.replace(/:[^:@]+@/, ':***@')} — ${(err as Error).message}`,
      );
    }

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
