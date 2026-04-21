import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RoomType } from '../room.schema';

export class CreateRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsEnum(RoomType)
  type: RoomType;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  password?: string;
}
