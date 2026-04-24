import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

// Fix 7.2: dedicated UpdateRoomDto — only name and description are mutable.
// Room type cannot change after creation; password changes go through a separate flow.
export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
