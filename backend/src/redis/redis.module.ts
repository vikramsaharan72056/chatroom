import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');
        // Detect TLS from REDIS_URL scheme: "rediss://" (double 's') = TLS required.
        // Without this, TCP connects but the server waits for a TLS handshake that
        // never arrives — causing redis.set() to hang silently and block all OTP flows.
        const redisUrl = process.env.REDIS_URL || '';
        const useTls = redisUrl.startsWith('rediss://');
        return new Redis({
          host,
          port,
          password: password || undefined,
          ...(useTls ? { tls: {} } : {}),
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
