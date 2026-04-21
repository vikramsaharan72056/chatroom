import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { UserDocument } from '../user/user.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async signup(dto: SignupDto): Promise<{ message: string }> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      isEmailVerified: false,
    });

    await this.emailService.sendOtp(user.email, 'verify');
    return { message: 'Signup successful. Check your email for OTP.' };
  }

  async verifyEmail(dto: VerifyOtpDto): Promise<{ message: string }> {
    await this.emailService.verifyOtp(dto.email, dto.otp, 'verify');
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('User not found');
    await this.userService.markEmailVerified(user._id.toString());
    return { message: 'Email verified successfully' };
  }

  async resendOtp(email: string, type: 'verify' | 'reset'): Promise<{ message: string }> {
    await this.emailService.sendOtp(email, type);
    return { message: 'OTP sent' };
  }

  async login(dto: LoginDto, res: any): Promise<{ accessToken: string; user: Partial<UserDocument> }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user, res);
  }

  async refreshTokens(user: UserDocument, res: any): Promise<{ accessToken: string }> {
    const { accessToken } = await this.issueTokens(user, res);
    return { accessToken };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (user) {
      await this.emailService.sendOtp(email, 'reset');
    }
    return { message: 'If that email exists, a reset OTP has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.emailService.verifyOtp(dto.email, dto.otp, 'reset');
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('User not found');
    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.userService.updatePassword(user._id.toString(), hashed);
    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (!user.password) throw new BadRequestException('No password set for this account');

    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new UnauthorizedException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.userService.updatePassword(userId, hashed);
    return { message: 'Password changed successfully' };
  }

  logout(res: any): { message: string } {
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
    return { message: 'Logged out' };
  }

  private async issueTokens(user: UserDocument, res: any) {
    const payload = { sub: user._id.toString(), email: user.email };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('nodeEnv') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: _p, ...safeUser } = user.toObject();
    return { accessToken, user: safeUser };
  }
}
