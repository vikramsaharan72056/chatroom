import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';
import { MessageModule } from '../message/message.module';
import { UserModule } from '../user/user.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [JwtModule.register({}), MessageModule, UserModule, RoomModule],
  providers: [ChatGateway, PresenceService],
  exports: [PresenceService],
})
export class GatewayModule {}
