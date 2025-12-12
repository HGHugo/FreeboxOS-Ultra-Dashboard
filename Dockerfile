# ===========================================
# FreeboxOS Ultra Dashboard - Docker Build
# Multi-stage build for production deployment
# ===========================================

# Stage 1: Build frontend (native platform for speed)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build frontend (Vite)
RUN npm run build

# Stage 2: Production image (target platform)
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S freebox -u 1001 -G nodejs

WORKDIR /app

# Create data directory for persistent token storage
RUN mkdir -p /app/data && chown -R freebox:nodejs /app/data

# Copy package files and install production dependencies only
# Using --ignore-scripts to avoid native compilation issues with QEMU
COPY --chown=freebox:nodejs package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built frontend from builder
COPY --chown=freebox:nodejs --from=builder /app/dist ./dist

# Copy backend source (TypeScript files - tsx runs them directly)
COPY --chown=freebox:nodejs --from=builder /app/server ./server
COPY --chown=freebox:nodejs --from=builder /app/tsconfig.json ./

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV FREEBOX_TOKEN_FILE=/app/data/freebox_token.json
ENV FREEBOX_HOST=mafreebox.freebox.fr

# Health check (use 127.0.0.1 instead of localhost to avoid IPv6 issues in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

# Switch to non-root user
USER freebox

# Expose port
EXPOSE 3000

# Start the server directly with tsx (not through npm to avoid double process)
CMD ["node_modules/.bin/tsx", "server/index.ts"]
