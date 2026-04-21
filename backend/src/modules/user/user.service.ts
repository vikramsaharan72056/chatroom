import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument, UserStatus } from './user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });
    this.bucket = this.configService.get<string>('aws.s3Bucket')!;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const existing = await this.findByEmail(data.email!);
    if (existing) throw new ConflictException('Email already in use');
    const user = new this.userModel(data);
    return user.save();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.avatar) {
      const oldKey = user.avatar.split('/').pop();
      if (oldKey) {
        await this.s3
          .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `avatars/${oldKey}` }))
          .catch(() => null);
      }
    }

    const key = `avatars/${uuidv4()}-${file.originalname}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const avatarUrl = `https://${this.bucket}.s3.${this.configService.get('aws.region')}.amazonaws.com/${key}`;
    user.avatar = avatarUrl;
    return user.save();
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { lastActive: new Date() }).exec();
  }

  async setStatus(userId: string, status: UserStatus): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { status }).exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { isEmailVerified: true }).exec();
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { password: hashedPassword }).exec();
  }
}
