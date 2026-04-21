import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../user/user.schema';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('room/:roomId')
  getRoomHistory(
    @Param('roomId') roomId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messageService.getRoomHistory(roomId, before, Number(limit ?? 50));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMessage(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.messageService.deleteMessage(id, user._id.toString());
  }
}
