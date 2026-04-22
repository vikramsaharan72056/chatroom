import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomDocument, RoomType } from './room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
  ) { }

  async create(userId: string, dto: CreateRoomDto): Promise<RoomDocument> {
    const data: Partial<Room> = {
      name: dto.name,
      description: dto.description ?? '',
      type: dto.type,
      createdBy: new Types.ObjectId(userId),
      members: [new Types.ObjectId(userId)],
      passwordHash: null,
      inviteToken: null,
    };

    if (dto.type === RoomType.PRIVATE) {
      data.inviteToken = uuidv4();
      if (dto.password) {
        data.passwordHash = await bcrypt.hash(dto.password, 10);
      }
    }

    const room = new this.roomModel(data);
    return room.save();
  }

  async join(userId: string, dto: JoinRoomDto): Promise<RoomDocument> {
    const room = await this.findById(dto.roomId);

    const isMember = room.members.some((m) => m.toString() === userId);
    if (isMember) return room;

    if (room.type === RoomType.PRIVATE) {
      const validToken = dto.inviteToken && room.inviteToken === dto.inviteToken;
      const validPassword =
        dto.password && room.passwordHash
          ? await bcrypt.compare(dto.password, room.passwordHash)
          : false;

      if (!validToken && !validPassword) {
        throw new ForbiddenException('Invalid invite token or password');
      }
    }

    room.members.push(new Types.ObjectId(userId));
    return room.save();
  }

  async findById(id: string): Promise<RoomDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid room ID');
    const room = await this.roomModel
      .findById(id)
      .populate('createdBy', 'name avatar')
      .populate('members', 'name avatar status lastActive')
      .exec();
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async findPublicRooms(page = 1, limit = 20): Promise<RoomDocument[]> {
    return this.roomModel
      .find({ type: RoomType.PUBLIC })
      .populate('createdBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async findUserRooms(userId: string): Promise<RoomDocument[]> {
    return this.roomModel
      .find({ members: new Types.ObjectId(userId) })
      .populate('createdBy', 'name avatar')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async generateInviteLink(roomId: string, userId: string): Promise<{ inviteToken: string }> {
    const room = await this.findById(roomId);
    if (room.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only room creator can generate invite links');
    }
    room.inviteToken = uuidv4();
    await room.save();
    return { inviteToken: room.inviteToken };
  }

  async leave(roomId: string, userId: string): Promise<void> {
    const room = await this.findById(roomId);
    room.members = room.members.filter((m) => m.toString() !== userId) as Types.ObjectId[];
    await room.save();
  }

  async update(roomId: string, userId: string, dto: Partial<CreateRoomDto>): Promise<RoomDocument> {
    const room = await this.findById(roomId);
    if (room.createdBy._id.toString() !== userId) {
      throw new ForbiddenException('Only room creator can update the room');
    }
    if (dto.name) room.name = dto.name;
    if (dto.description !== undefined) room.description = dto.description;
    return room.save();
  }

  async remove(roomId: string, userId: string): Promise<void> {
    const room = await this.findById(roomId);
    if (room.createdBy._id.toString() !== userId) {
      throw new ForbiddenException('Only room creator can delete the room');
    }
    await this.roomModel.deleteOne({ _id: new Types.ObjectId(roomId) });
  }
}
