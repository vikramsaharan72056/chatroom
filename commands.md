# Commands

## Prerequisites

Make sure these are installed before running anything:

- [Node.js 20+](https://nodejs.org/)
- [Redis](https://redis.io/) running locally
- MongoDB Atlas URI (or local MongoDB)
- AWS credentials (SES + S3) — optional for local dev, required for email/avatar

---

## 1. Start Redis (local)

**With Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**With WSL / Linux:**
```bash
sudo service redis-server start
```

---

## 2. Backend Setup

```bash
cd backend
```

**Install dependencies:**
```bash
npm install
```

**Create your `.env` file:**
```bash
cp .env.example .env
```

Then open `.env` and fill in:
```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatapp

JWT_ACCESS_SECRET=any-random-secret-here
JWT_REFRESH_SECRET=another-random-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your IAM key>
AWS_SECRET_ACCESS_KEY=<your IAM secret>
AWS_S3_BUCKET=<your bucket name>
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

OTP_EXPIRES_MINUTES=10
```

**Run in development (hot reload):**
```bash
npm run start:dev
```

**Build and run in production mode:**
```bash
npm run build
node dist/main.js
```

Backend runs at: `http://localhost:3000`

---

## 3. Frontend Setup

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Run in development:**
```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

> Vite automatically proxies `/api` and `/socket.io` to `http://localhost:3000` — no CORS config needed in dev.

**Build for production:**
```bash
npm run build
```

Output goes to `frontend/dist/`.

---

## 4. Run Both Together (from project root)

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend && npm run start:dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 5. EC2 Production Deployment (Manual)

SSH into your EC2 instance, then:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx

# Install and start Redis
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server

# Clone your repos
mkdir ~/app && cd ~/app
git clone <your-backend-repo-url> backend
git clone <your-frontend-repo-url> frontend

# Backend — configure and start
cd ~/app/backend
cp .env.production .env
# edit .env with production values
npm ci
npm run build
pm2 start dist/main.js --name chatapp-backend
pm2 save
pm2 startup   # follow the printed command to enable on reboot

# Frontend — build and copy dist
cd ~/app/frontend
npm ci
npm run build

# Nginx config
sudo cp ~/app/nginx.conf /etc/nginx/sites-available/chatapp
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/chatapp
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. GitHub Actions CI/CD

Add these secrets in each GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP address |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your EC2 `.pem` private key file |
| `VITE_API_URL` | `http://<ec2-ip>` (frontend repo only) |

Once set, every push to `main` automatically deploys.

---

## 7. Useful Commands

| Task | Command |
|---|---|
| Check backend logs (PM2) | `pm2 logs chatapp-backend` |
| Restart backend | `pm2 restart chatapp-backend` |
| Check Nginx status | `sudo systemctl status nginx` |
| Test Nginx config | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Redis CLI | `redis-cli ping` |
| View Redis keys | `redis-cli keys "*"` |
