import { IsEmail, IsIn } from 'class-validator';

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsIn(['verify', 'reset'])
  type: 'verify' | 'reset';
}
