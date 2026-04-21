# Real-Time Collaboration Chat App

A production-grade real-time chatroom platform built with NestJS, React, Socket.IO, Redis, MongoDB, and deployed on AWS EC2.

---

## Features

- JWT authentication (access + refresh token, httpOnly cookie)
- Email OTP verification via AWS SES (signup, forgot password)
- Google OAuth via Passport.js
- Create public/private rooms (invite link or password)
- Real-time messaging with Socket.IO
- WhatsApp-style reply-to messages
- Presence system (online/offline per room)
- Typing indicators
- Message history loaded on room join
- Avatar upload to AWS S3
- EC2 deployment with Nginx + PM2 + GitHub Actions CI/CD

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Redux Toolkit |
| Backend | NestJS + TypeScript |
| Real-time | Socket.IO |
| Cache / Pub-Sub | Redis |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + Passport.js (Google OAuth) |
| Email | AWS SES |
| Storage | AWS S3 |
| Deployment | EC2 + Nginx + PM2 + GitHub Actions |

---

## Project Structure

```
/
├── backend/           # NestJS API + WebSocket server
│   └── src/
│       ├── modules/
│       │   ├── auth/       # JWT, Google OAuth, SES OTP
│       │   ├── user/       # Profile, S3 avatar
│       │   ├── room/       # Create/join rooms
│       │   ├── message/    # Chat history, reply-to
│       │   └── gateway/    # Socket.IO + presence
│       ├── redis/          # Global Redis client
│       ├── common/         # Guards, decorators, filters
│       └── config/         # Typed config via ConfigService
└── frontend/          # Vite + React SPA
    └── src/
        ├── app/        # Redux store
        ├── features/   # auth, room, messages, presence slices
        ├── pages/      # Auth pages + Room/Chat pages
        ├── components/ # UI primitives + chat components
        ├── hooks/      # useSocket (event bus)
        └── services/   # Axios (with token refresh) + socket.io
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas URI
- Redis (local Docker: `docker run -p 6379:6379 redis`)
- AWS account (SES + S3)
- Google Cloud OAuth credentials

### Backend

```bash
cd backend
cp .env.example .env
# fill in .env values
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/socket.io` to `http://localhost:3000` in dev mode.

---

## EC2 Deployment

### EC2 Setup (Ubuntu 22.04)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 + Nginx
npm install -g pm2
sudo apt-get install -y nginx

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server

# Clone repos
mkdir ~/app && cd ~/app
git clone <backend-repo> backend
git clone <frontend-repo> frontend

# Backend
cd ~/app/backend
cp .env.production .env   # fill in values
npm ci && npm run build
pm2 start dist/main.js --name chatapp-backend
pm2 save && pm2 startup

# Nginx config
sudo cp ~/app/nginx.conf /etc/nginx/sites-available/chatapp
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### GitHub Actions Secrets

Set these in each repo's GitHub Settings → Secrets:

| Secret | Value |
|---|---|
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` key file |
| `VITE_API_URL` | `http://<ec2-ip>` (frontend repo only) |

Push to `main` triggers automatic deploy.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register, sends OTP |
| POST | `/api/auth/verify-email` | Verify OTP |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/google` | Google OAuth redirect |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/reset-password` | Reset with OTP |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/logout` | Clear refresh token |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rooms` | Create room |
| POST | `/api/rooms/join` | Join by ID/token/password |
| GET | `/api/rooms/my` | My rooms |
| GET | `/api/rooms/public` | Discover public rooms |
| GET | `/api/rooms/:id` | Get room details |
| POST | `/api/rooms/:id/invite` | Generate invite token |
| DELETE | `/api/rooms/:id/leave` | Leave room |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/room/:roomId` | Paginated history |
| DELETE | `/api/messages/:id` | Soft-delete own message |

### WebSocket Events

**Client → Server:**
| Event | Payload |
|---|---|
| `join_room` | `{ roomId }` |
| `leave_room` | `{ roomId }` |
| `send_message` | `{ roomId, content, replyToId? }` |
| `typing` | `{ roomId, isTyping }` |
| `heartbeat` | — |

**Server → Client:**
| Event | Payload |
|---|---|
| `new_message` | `{ roomId, message }` |
| `room_history` | `{ roomId, messages[] }` |
| `user_joined` | `{ userId, userName, roomId }` |
| `user_left` | `{ userId, userName, roomId }` |
| `presence_update` | `{ roomId, onlineMembers[] }` |
| `user_typing` | `{ roomId, userId, userName, isTyping }` |

---

## Scaling Approach

### Current Architecture (Single Server)
```
Client ──► Nginx ──► NestJS (PM2) ──► MongoDB Atlas
                       │
                      Redis (presence + OTP)
```

### Horizontal Scaling (Multiple EC2 Instances)

The system is designed to scale horizontally with minimal changes:

**WebSocket fan-out via Redis Pub/Sub**

Socket.IO's `@socket.io/redis-adapter` ensures that events emitted on Instance A are delivered to clients connected on Instance B. Add it by:

```bash
npm install @socket.io/redis-adapter
```

```typescript
// In GatewayModule
import { createAdapter } from '@socket.io/redis-adapter';
// Attach in afterInit() hook on the gateway
this.server.adapter(createAdapter(pubClient, subClient));
```

**Session state is already Redis-based** — presence, OTPs, and online members are stored in Redis, not in-process memory, so any instance can read them.

**Behind an AWS ALB (Application Load Balancer)**:
- Enable **sticky sessions** for WebSocket connections, or
- Use Redis adapter (preferred) which eliminates the need for stickiness entirely.

**MongoDB Atlas** scales independently via Atlas auto-scaling.

**Why this scales well:**
- No in-process state — Redis is the single source of truth for presence
- Stateless NestJS instances can be added/removed freely
- Message history in MongoDB Atlas handles read replicas for query scaling
