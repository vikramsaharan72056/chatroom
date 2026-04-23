# Real-Time Collaboration Chat App

A production-grade real-time chatroom platform built with NestJS, React, Socket.IO, Redis, MongoDB Atlas, and deployed on AWS.

Live: **https://www.youarenotweird.com**

---

## Features

- JWT authentication (access + refresh token, httpOnly cookie)
- Email OTP verification via AWS SES (signup, forgot password, password reset)
- Google OAuth via Passport.js
- Create public / private rooms (invite link or password)
- Real-time messaging with Socket.IO
- Reply-to messages (WhatsApp-style)
- Real-time presence (online / offline per room)
- Typing indicators
- Message history loaded on room join
- **Shared code/text editor** — live-synced across all room members
- Avatar upload to AWS S3
- Horizontal scaling via Redis pub/sub adapter + AWS ASG

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Redux Toolkit |
| Backend | NestJS + TypeScript |
| Real-time | Socket.IO + `@socket.io/redis-adapter` |
| Cache / Pub-Sub | Redis (AWS ElastiCache) |
| Database | MongoDB Atlas |
| Auth | JWT + Passport.js (Google OAuth) |
| Email | AWS SES |
| Storage | AWS S3 |
| Frontend Hosting | AWS Amplify + CloudFront |
| Backend Hosting | EC2 Auto Scaling Group behind ALB |
| CI/CD | GitHub Actions |

---

## Project Structure

```
/
├── backend/                   # NestJS API + WebSocket server
│   └── src/
│       ├── modules/
│       │   ├── auth/          # JWT, Google OAuth, SES OTP
│       │   ├── user/          # Profile, S3 avatar
│       │   ├── room/          # Create/join/leave rooms
│       │   ├── message/       # Chat history, reply-to, soft-delete
│       │   └── gateway/       # Socket.IO + presence + shared editor
│       ├── redis/             # Global Redis client module
│       ├── common/            # Guards, decorators, exception filters
│       └── config/            # Typed config via ConfigService
├── frontend/                  # Vite + React SPA
│   └── src/
│       ├── app/               # Redux store
│       ├── features/          # auth, room, messages, presence, editor slices
│       ├── pages/             # Auth pages + HomePage + RoomPage
│       ├── components/        # UI primitives, chat, shared editor
│       ├── hooks/             # useSocket (central event bus)
│       └── services/          # Axios (auto token refresh) + socket.io
├── nginx.conf                 # Nginx reverse-proxy config (EC2)
├── ecosystem.config.js        # PM2 cluster config (EC2)
└── .github/workflows/
    └── deploy.yml             # CI (lint + build + test) + CD (SSH deploy)
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas URI
- Redis — `docker run -p 6379:6379 redis`
- AWS account (SES + S3)
- Google Cloud OAuth credentials

### Backend

```bash
cd backend
cp .env.example .env   # fill in all values
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/socket.io` to `http://localhost:3000` in dev mode, so no CORS config needed locally.

---

## Production Architecture

```
                          ┌─────────────────────────────┐
                          │   AWS Amplify + CloudFront   │
                          │  www.youarenotweird.com       │
                          │  React SPA (static assets)   │
                          └──────────────┬───────────────┘
                                         │ HTTPS API / WebSocket
                          ┌──────────────▼───────────────┐
                          │  Application Load Balancer    │
                          │  chatroom.youarenotweird.com  │
                          │  HTTPS 443 → HTTP 80          │
                          │  Sticky sessions (1 day)      │
                          └──────────┬────────────────────┘
                                     │
               ┌─────────────────────┴──────────────────────┐
               │                                             │
   ┌───────────▼──────────┐                   ┌─────────────▼──────────┐
   │  EC2 t3.micro (AZ-a) │                   │  EC2 t3.micro (AZ-b)   │
   │  Nginx → PM2 cluster │                   │  Nginx → PM2 cluster   │
   │  NestJS (port 3000)  │                   │  NestJS (port 3000)    │
   └───────────┬──────────┘                   └─────────────┬──────────┘
               │                                             │
               └─────────────────┬───────────────────────────┘
                                  │ Redis pub/sub (socket fan-out)
                     ┌────────────▼────────────┐
                     │  AWS ElastiCache Redis   │
                     │  (presence, OTP, editor) │
                     └─────────────────────────┘
                                  │
                     ┌────────────▼────────────┐
                     │     MongoDB Atlas        │
                     │  (messages, users, rooms)│
                     └─────────────────────────┘
```

### Auto Scaling

- **ASG**: min 2 / max 10 instances, spread across 2 AZs
- **Scale-out trigger**: average CPU > 60% for 2 consecutive minutes
- **Scale-in cooldown**: 300 s to avoid thrashing
- **Why it works at scale**: All Socket.IO state lives in Redis (via `@socket.io/redis-adapter`), not in process memory. Any new EC2 instance can handle any client's WebSocket connection because event fan-out is handled by the Redis pub/sub bus.
- **ALB sticky sessions** (1-day duration) are also enabled as a belt-and-suspenders fallback for long-lived connections.

---

## EC2 Instance Setup (Ubuntu 22.04)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 + Nginx
npm install -g pm2
sudo apt-get install -y nginx

# App directory
mkdir -p ~/app && cd ~/app
git clone https://github.com/vikramsaharan72056/chatroom.git .

# Backend
cd ~/app/backend
cp .env.production .env   # fill in values
npm ci && npm run build

# Start with PM2 using ecosystem config
pm2 start ~/app/ecosystem.config.js --env production
pm2 save && pm2 startup

# Nginx
sudo cp ~/app/nginx.conf /etc/nginx/sites-available/chatapp
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### GitHub Actions Secrets

Set these in repo **Settings → Environments → production → Secrets**:

| Secret | Value |
|---|---|
| `EC2_HOST` | EC2 public IP / hostname |
| `EC2_USER` | `ubuntu` (or `ec2-user`) |
| `EC2_SSH_KEY` | Contents of your `.pem` private key |
| `ENV_FILE` | Full contents of backend `.env` |

Push to `main` with changes under `backend/` triggers automatic deploy.

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
| POST | `/api/auth/change-password` | Change (authenticated) |
| POST | `/api/auth/logout` | Clear refresh token cookie |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rooms` | Create room |
| POST | `/api/rooms/join` | Join by ID, invite token, or password |
| GET | `/api/rooms/my` | My rooms |
| GET | `/api/rooms/public` | Discover public rooms |
| GET | `/api/rooms/:id` | Room details |
| POST | `/api/rooms/:id/invite` | Generate invite token |
| DELETE | `/api/rooms/:id/leave` | Leave room |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/room/:roomId` | Paginated history |
| DELETE | `/api/messages/:id` | Soft-delete own message |

### WebSocket Events

**Client → Server:**
| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ roomId }` | Subscribe to room |
| `leave_room` | `{ roomId }` | Unsubscribe |
| `send_message` | `{ roomId, content, replyToId? }` | Send chat message |
| `typing` | `{ roomId, isTyping }` | Typing indicator |
| `editor_update` | `{ roomId, content }` | Shared editor change |
| `heartbeat` | — | Keep-alive ping |

**Server → Client:**
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ roomId, message }` | New chat message |
| `room_history` | `{ roomId, messages[] }` | History on join |
| `user_joined` | `{ userId, userName, roomId }` | Member joined |
| `user_left` | `{ userId, userName, roomId }` | Member left |
| `presence_update` | `{ roomId, onlineMembers[] }` | Online list changed |
| `user_typing` | `{ roomId, userId, userName, isTyping }` | Typing state |
| `editor_state` | `{ roomId, content }` | Current editor content on join |
| `editor_update` | `{ roomId, content, updatedBy }` | Live editor broadcast |

---

## Environment Variables

```env
# backend/.env
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_HOST=...elasticache.amazonaws.com
REDIS_PORT=6379
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SES_FROM_EMAIL=no-reply@youarenotweird.com
AWS_S3_BUCKET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://chatroom.youarenotweird.com/api/auth/google/callback
FRONTEND_URL=https://www.youarenotweird.com
```
