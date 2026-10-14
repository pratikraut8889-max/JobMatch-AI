# ==========================================
# JobMatch AI v2.0 - Multi-Stage Dockerfile
# ==========================================

# 1. Base build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite client assets
RUN npm run build

# 2. Production runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./

# Create data directory for persistent local store
RUN mkdir -p /app/.data

EXPOSE 3000

# Run full-stack Express server
CMD ["npx", "tsx", "server.ts"]
