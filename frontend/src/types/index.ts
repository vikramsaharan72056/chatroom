export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  phoneNumber: string | null;
  status: 'Active' | 'Inactive';
  isEmailVerified: boolean;
  lastActive: string | null;
  createdAt: string;
}

export interface Room {
  _id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  createdBy: Pick<User, '_id' | 'name' | 'avatar'>;
  members: Pick<User, '_id' | 'name' | 'avatar' | 'status' | 'lastActive'>[];
  createdAt: string;
}

export interface Message {
  _id: string;
  room: string;
  sender: Pick<User, '_id' | 'name' | 'avatar'>;
  content: string;
  replyTo: (Message & { sender: Pick<User, '_id' | 'name'> }) | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface PresenceMap {
  [userId: string]: boolean;
}
