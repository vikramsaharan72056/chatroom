import { IsString, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
