# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source & compile TypeScript
COPY . .
RUN npm run build

# Prune dev dependencies — only keep production deps
RUN npm ci --omit=dev


# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Add curl for Docker/ALB health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy compiled output and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Healthcheck so Docker / ECS knows when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
