import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../user/user.schema';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateRoomDto) {
    return this.roomService.create(user._id.toString(), dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@CurrentUser() user: UserDocument, @Body() dto: JoinRoomDto) {
    return this.roomService.join(user._id.toString(), dto);
  }

  @Get('public')
  getPublic(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.roomService.findPublicRooms(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('my')
  getMyRooms(@CurrentUser() user: UserDocument) {
    return this.roomService.findUserRooms(user._id.toString());
  }

  @Get(':id')
  getRoom(@Param('id') id: string) {
    return this.roomService.findById(id);
  }

  @Post(':id/invite')
  generateInvite(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.roomService.generateInviteLink(id, user._id.toString());
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.roomService.leave(id, user._id.toString());
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: Partial<CreateRoomDto>,
  ) {
    return this.roomService.update(id, user._id.toString(), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.roomService.remove(id, user._id.toString());
  }
}
