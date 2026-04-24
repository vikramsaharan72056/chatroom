import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

// ── Required environment variables ────────────────────────────────────────────
// The app will refuse to start if any of these are missing/empty.
// This prevents the classic silent-boot-then-crash-on-first-request failure.
const REQUIRED_ENV: string[] = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_USER',
  'SMTP_PASS',
  'REDIS_HOST',
];

function validateRequiredEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Use plain console here — Logger is not yet initialised
    console.error(
      `[Bootstrap] FATAL — missing required environment variables:\n  ${missing.join('\n  ')}`,
    );
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  validateRequiredEnv();

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Server running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

// Fix 1.2: top-level error handler ensures PM2 sees a non-zero exit code
// on any startup failure (Redis down, Mongo unreachable, etc.)
bootstrap().catch((err: unknown) => {
  console.error('Fatal: application failed to start', err);
  process.exit(1);
});
