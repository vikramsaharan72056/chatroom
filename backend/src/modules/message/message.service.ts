import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

export interface CreateMessageInput {
  roomId: string;
  senderId: string;
  content: string;
  replyToId?: string;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
  ) {}

  async create(input: CreateMessageInput): Promise<MessageDocument> {
    const msg = new this.messageModel({
      room: new Types.ObjectId(input.roomId),
      sender: new Types.ObjectId(input.senderId),
      content: input.content.trim(),
      replyTo: input.replyToId ? new Types.ObjectId(input.replyToId) : null,
    });
    const saved = await msg.save();
    return saved.populate([
      { path: 'sender', select: 'name avatar' },
      { path: 'replyTo', populate: { path: 'sender', select: 'name' } },
    ]);
  }

  async getRoomHistory(
    roomId: string,
    before?: string,
    limit = 50,
  ): Promise<MessageDocument[]> {
    const query: Record<string, unknown> = {
      room: new Types.ObjectId(roomId),
      isDeleted: false,
    };

    if (before) {
      query['_id'] = { $lt: new Types.ObjectId(before) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name' } })
      .exec();

    return messages.reverse();
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await this.messageModel.findById(messageId).exec();
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.sender.toString() !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s message');
    }
    msg.isDeleted = true;
    await msg.save();
  }
}
