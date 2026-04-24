import { Injectable, BadRequestException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';

// NOTE: AWS SES code kept for reference — replaced with Nodemailer + Gmail
// import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

type OtpPurpose = 'verify' | 'reset';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly otpTtl: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.fromEmail = this.configService.get<string>('smtp.from')!;
    this.otpTtl = this.configService.get<number>('otp.expiresMinutes')! * 60;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.pass'),
      },
    });
  }

  async sendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    const otp = this.generateOtp();
    const key = this.redisKey(email, purpose);

    try {
      await this.redis.set(key, otp, 'EX', this.otpTtl);
    } catch (err) {
      this.logger.error(`Redis write failed for OTP key ${key}`, (err as Error).message);
      throw new InternalServerErrorException('Could not store OTP. Please try again.');
    }

    const subject = purpose === 'verify' ? 'Verify your email' : 'Reset your password';
    const body = `Your OTP is: <strong>${otp}</strong>. It expires in ${this.otpTtl / 60} minutes.`;

    try {
      await this.transporter.sendMail({
        from: `"ChatApp" <${this.fromEmail}>`,
        to: email,
        subject,
        html: body,
      });
    } catch (err) {
      this.logger.error(`SMTP delivery failed for ${email}`, (err as Error).message);
      throw new InternalServerErrorException('Could not send OTP email. Please try again.');
    }

    // Fix 2.1: OTP value is intentionally omitted from logs (security)
    this.logger.log(`OTP sent to ${email} for purpose="${purpose}"`);
  }

  async verifyOtp(email: string, otp: string, purpose: OtpPurpose): Promise<void> {
    const key = this.redisKey(email, purpose);
    const stored = await this.redis.get(key);
    if (!stored || stored !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    await this.redis.del(key);
  }

  // Fix 4.2: crypto.randomInt is a CSPRNG — Math.random() is NOT safe for OTPs
  private generateOtp(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  private redisKey(email: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${email}`;
  }
}
